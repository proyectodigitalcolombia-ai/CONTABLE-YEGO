const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. CONEXIÓN BÁSICA
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// 2. MODELO FINANZAS (TU TABLA LOCAL - Esta la controla Sequelize sin líos)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

// 3. RUTA PRINCIPAL CON SQL CRUDO
app.get('/', async (req, res) => {
  try {
    // Consultamos la tabla Cargas usando comillas dobles exactas para el ID
    const cargas = await db.query('SELECT "ID", "PLACA", "CLI", "F_D" FROM "Cargas" ORDER BY "ID" DESC LIMIT 50', {
      type: QueryTypes.SELECT
    });

    // Obtenemos nuestros datos financieros locales
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      // Buscamos si ya tiene registro contable
      const f = finanzas.find(fin => fin.cargaId === c.ID);
      const flete = f ? Number(f.v_flete).toLocaleString() : "0";
      const estado = f ? f.est_pago : "PENDIENTE";

      return `
        <tr style="border-bottom:1px solid #334155">
          <td style="padding:10px">#${c.ID}</td>
          <td><b>${c.PLACA || '---'}</b></td>
          <td>${c.CLI || '---'}</td>
          <td>${c.F_D || '---'}</td>
          <td style="color:#10b981;font-weight:bold">$ ${flete}</td>
          <td>${estado}</td>
          <td><a href="/editar/${c.ID}" style="color:#3b82f6;text-decoration:none;font-weight:bold">GESTIONAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:20px">
        <h2 style="color:#3b82f6">💰 Panel Contable YEGO (Modo Directo)</h2>
        <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden">
          <thead style="background:#1e40af">
            <tr><th style="padding:12px">ID</th><th>PLACA</th><th>CLIENTE</th><th>FECHA</th><th>FLETE</th><th>ESTADO</th><th>ACCION</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("<h3>Error Crítico</h3><p>" + err.message + "</p>");
  }
});

// 4. RUTA EDITAR
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;padding:40px">
      <div style="background:#1e293b;padding:25px;border-radius:15px;max-width:400px;margin:auto;border:1px solid #3b82f6">
        <h3>Servicio #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST">
          <label>Valor Flete:</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="display:block;width:100%;margin:10px 0;padding:10px;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">
          <label>Estado:</label>
          <select name="est_pago" style="display:block;width:100%;margin:10px 0;padding:10px;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:5px;cursor:pointer">GUARDAR</button>
          <a href="/" style="display:block;text-align:center;margin-top:15px;color:#94a3b8;text-decoration:none">Volver</a>
        </form>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Modo Directo Activo')));
