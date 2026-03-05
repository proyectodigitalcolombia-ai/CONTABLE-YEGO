const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// Tabla local de Finanzas
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

// --- RUTA DE DIAGNÓSTICO (Para saber el nombre real de la columna) ---
app.get('/debug', async (req, res) => {
  try {
    const info = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Cargas'`, 
      { type: QueryTypes.SELECT }
    );
    res.json({ mensaje: "Estas son las columnas que detecta el sistema:", columnas: info });
  } catch (err) {
    res.status(500).send("Error consultando estructura: " + err.message);
  }
});

// --- RUTA PRINCIPAL (SQL CRUDO SIN COMILLAS PARA PROBAR) ---
app.get('/', async (req, res) => {
  try {
    // Probamos la consulta más simple posible. 
    // Si ID con comillas falló, probamos ID sin comillas.
    const sql = 'SELECT * FROM "Cargas" ORDER BY 1 DESC LIMIT 50';
    
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      // Intentamos detectar si el ID viene en mayúsculas o minúsculas
      const idReal = c.ID || c.id || c.Id; 
      const f = finanzas.find(fin => fin.cargaId === idReal);
      
      return `
        <tr style="border-bottom:1px solid #334155">
          <td style="padding:10px">#${idReal}</td>
          <td>${c.PLACA || c.placa || '---'}</td>
          <td>${c.CLIENTE || c.cliente || '---'}</td>
          <td style="color:#10b981;font-weight:bold">$ ${f ? Number(f.v_flete).toLocaleString() : "0"}</td>
          <td>${f ? f.est_pago : "PENDIENTE"}</td>
          <td><a href="/editar/${idReal}" style="color:#3b82f6">EDITAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px">
        <h2>💰 Sistema Contable YEGO</h2>
        <p style="color:#94a3b8">Si no ves datos, entra a <a href="/debug" style="color:#3b82f6">/debug</a> para ver los nombres reales.</p>
        <table style="width:100%;border-collapse:collapse;background:#1e293b">
          <thead style="background:#1e40af">
            <tr><th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FLETE</th><th>ESTADO</th><th>ACCION</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("<h3>Error de Sistema</h3><p>Detalle: " + err.message + "</p>");
  }
});

// RUTAS DE GUARDADO
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a;color:#f1f5f9;padding:40px">
      <form action="/guardar/${req.params.id}" method="POST">
        <h3>Editar #${req.params.id}</h3>
        Flete: <input type="number" name="v_flete" value="${f.v_flete}"><br><br>
        Estado: <select name="est_pago">
          <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select><br><br>
        <button type="submit">GUARDAR</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Servidor listo')));
