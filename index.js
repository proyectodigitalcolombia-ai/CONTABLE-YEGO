const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. CONEXIÓN LIMPIA (NODE_VERSION 20)
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// 2. TABLA YEGO_FINANZAS (La que nosotros creamos y controlamos)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

// 3. RUTA PRINCIPAL - CONSULTA PURA Y DURA
app.get('/', async (req, res) => {
  try {
    // Traemos los datos de la plataforma logística con SQL puro
    // Usamos comillas dobles solo para el nombre de la tabla si es necesario
    const cargas = await db.query('SELECT * FROM "Cargas" ORDER BY "ID" DESC LIMIT 100', {
      type: QueryTypes.SELECT
    });

    // Traemos nuestros datos de pagos aparte
    const pagos = await Finanza.findAll();

    // Hacemos el cruce de datos manualmente (Cero riesgo de error de columna)
    let filas = cargas.map(c => {
      const p = pagos.find(pago => pago.cargaId === c.ID);
      const flete = p ? Number(p.v_flete).toLocaleString() : "0";
      const estado = p ? p.est_pago : "PENDIENTE";
      const colorEstado = estado === 'PAGADO' ? '#065f46' : '#7f1d1d';

      return `
        <tr style="border-bottom:1px solid #334155">
          <td style="padding:12px">#${c.ID}</td>
          <td><b>${c.PLACA || '---'}</b></td>
          <td>${c.CLIENTE || '---'}</td>
          <td>${c["FECHA DESPACHO"] || '---'}</td>
          <td style="color:#10b981; font-weight:bold">$ ${flete}</td>
          <td><span style="background:${colorEstado}; padding:4px 8px; border-radius:5px; font-size:11px">${estado}</span></td>
          <td><a href="/editar/${c.ID}" style="color:#3b82f6; text-decoration:none; font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px">
        <h2 style="color:#3b82f6">💰 Panel Contable YEGO</h2>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden">
          <thead style="background:#1e40af">
            <tr>
              <th style="padding:12px; text-align:left">ID</th>
              <th style="text-align:left">PLACA</th>
              <th style="text-align:left">CLIENTE</th>
              <th style="text-align:left">DESPACHO</th>
              <th style="text-align:left">VALOR FLETE</th>
              <th style="text-align:left">ESTADO</th>
              <th style="text-align:left">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("<h3>Error de Sincronización</h3><p>" + err.message + "</p>");
  }
});

// 4. RUTAS DE ACTUALIZACIÓN (SIN CAMBIOS, YA FUNCIONAN)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:40px">
      <div style="background:#1e293b; padding:25px; border-radius:15px; max-width:350px; margin:auto; border:1px solid #3b82f6">
        <h3>Liquidación #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST">
          <label>VALOR FLETE:</label><br>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; margin:10px 0; padding:10px; background:#0f172a; color:#10b981; border:1px solid #334155; font-size:18px">
          <label>ESTADO:</label><br>
          <select name="est_pago" style="width:100%; margin:10px 0; padding:10px; background:#0f172a; color:white; border:1px solid #334155">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select><br><br>
          <button type="submit" style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold">GUARDAR</button>
        </form>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Operativo')));
