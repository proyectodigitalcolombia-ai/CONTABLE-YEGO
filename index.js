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

app.get('/', async (req, res) => {
  try {
    // Usamos asterisco para traer TODO y asegurar que no falte nada
    const sql = 'SELECT * FROM "Cargas" ORDER BY "ID" DESC LIMIT 50';
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      // Mapeamos los nombres exactos que vimos en el HTML de la plataforma
      const idReal = c.ID;
      const placa = c.PLACA || '---';
      const cliente = c.CLIENTE || '---';
      const fecha = c["FECHA DESPACHO"] || '---';
      
      const f = finanzas.find(fin => fin.cargaId === idReal);
      const flete = f ? Number(f.v_flete).toLocaleString() : "0";
      const estado = f ? f.est_pago : "PENDIENTE";

      return `
        <tr style="border-bottom:1px solid #334155">
          <td style="padding:12px">#${idReal}</td>
          <td><b>${placa}</b></td>
          <td>${cliente}</td>
          <td>${fecha}</td>
          <td style="color:#10b981;font-weight:bold">$ ${flete}</td>
          <td><span style="background:${estado === 'PAGADO' ? '#065f46' : '#7f1d1d'};padding:4px 8px;border-radius:5px;font-size:11px">${estado}</span></td>
          <td><a href="/editar/${idReal}" style="color:#3b82f6;text-decoration:none;font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px">
        <h2 style="color:#3b82f6">💰 Panel Contable YEGO</h2>
        <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden">
          <thead style="background:#1e40af">
            <tr>
              <th style="padding:12px">ID</th>
              <th>PLACA</th>
              <th>CLIENTE</th>
              <th>DESPACHO</th>
              <th>VALOR FLETE</th>
              <th>ESTADO</th>
              <th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>\${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// Rutas de edición (se mantienen igual)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:40px">
      <form action="/guardar/\${req.params.id}" method="POST" style="background:#1e293b;padding:25px;border-radius:15px;max-width:350px;margin:auto;border:1px solid #3b82f6">
        <h3>Servicio #\${req.params.id}</h3>
        <label>Valor Flete:</label>
        <input type="number" name="v_flete" value="\${f.v_flete}" step="0.01" style="width:100%;margin:10px 0;padding:10px;background:#0f172a;color:#10b981;border:1px solid #334155;font-size:18px">
        <label>Estado:</label>
        <select name="est_pago" style="width:100%;margin:10px 0;padding:10px;background:#0f172a;color:white;border:1px solid #334155">
          <option \${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option \${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold">GUARDAR</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Operativo')));
