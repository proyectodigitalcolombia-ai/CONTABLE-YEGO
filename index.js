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

const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const sql = 'SELECT * FROM "Cargas" ORDER BY 1 DESC LIMIT 100';
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      // MANTENEMOS LA LÓGICA DE DETECCIÓN QUE FUNCIONA
      const idReal = c.ID || c.id || c.Id; 
      const placa = c.PLACA || c.placa || '---';
      const cliente = c.CLIENTE || c.cliente || '---';
      const fechaDespacho = c["FECHA DESPACHO"] || c.fecha_despacho || '---';
      const despachador = c.DESPACHADOR || c.despachador || '---';
      
      const f = finanzas.find(fin => fin.cargaId === idReal);
      const flete = f ? Number(f.v_flete).toLocaleString('es-CO') : "0";
      const estado = f ? f.est_pago : "PENDIENTE";
      const colorEstado = estado === 'PAGADO' ? '#10b981' : '#ef4444';

      return `
        <tr style="border-bottom: 1px solid #334155">
          <td style="padding:12px">#${idReal}</td>
          <td><b>${placa}</b></td>
          <td>${cliente}</td>
          <td>${fechaDespacho}</td>
          <td style="color:#10b981; font-weight:bold">$ ${flete}</td>
          <td><span style="color:${colorEstado}; font-weight:bold">${estado}</span></td>
          <td>${despachador}</td>
          <td><a href="/editar/${idReal}" style="color:#3b82f6; text-decoration:none; font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px">
        <h2 style="color:#3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom:10px">🚛 LOGÍSTICA YEGO - MÓDULO CONTABLE</h2>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden">
          <thead style="background:#1e40af; color:white">
            <tr>
              <th style="padding:15px; text-align:left">ID</th>
              <th style="text-align:left">PLACA</th>
              <th style="text-align:left">CLIENTE</th>
              <th style="text-align:left">FECHA DESPACHO</th>
              <th style="text-align:left">VALOR FLETE</th>
              <th style="text-align:left">ESTADO PAGO</th>
              <th style="text-align:left">DESPACHADOR</th>
              <th style="text-align:left">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("Error de visualización: " + err.message);
  }
});

// RUTAS DE EDICIÓN (Se mantienen intactas por seguridad)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:50px">
      <div style="max-width:350px; margin:auto; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6">
        <h3>Liquidar Servicio #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST">
          <label>VALOR FLETE (COP):</label><br>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155"><br>
          <label>ESTADO:</label><br>
          <select name="est_pago" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select><br><br>
          <button type="submit" style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer">ACTUALIZAR PAGO</button>
        </form>
        <p style="text-align:center"><a href="/" style="color:#94a3b8; text-decoration:none; font-size:12px">Volver al inicio</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 YEGO Online')));
