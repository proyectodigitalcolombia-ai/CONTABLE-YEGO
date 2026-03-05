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
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    // Traemos c.est_real que es el "ESTADO FINAL" en LogisV20
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      const fletePagar = f ? Number(f.v_flete) : 0;
      const fleteFacturar = f ? Number(f.v_facturar) : 0;
      const estadoContable = f ? f.est_pago : "PENDIENTE";
      
      // ESTE ES EL "ESTADO FINAL" DE LOGISV20
      const estadoLogisV20 = c.est_real || '---';

      if(estadoContable === 'PENDIENTE') totalPendiente += fletePagar;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="padding: 6px; color: #94a3b8;">#${c.id}</td>
          <td style="padding: 6px;">${c.f_doc || '---'}</td>
          <td style="padding: 6px;">${c.oficina || '---'}</td>
          <td style="padding: 6px;">${c.orig || '---'}</td>
          <td style="padding: 6px;">${c.dest || '---'}</td>
          <td style="padding: 6px;">${c.cli || '---'}</td>
          <td style="padding: 6px;">${c.cont || '---'}</td>
          <td style="padding: 6px;">${c.ped || '---'}</td>
          <td style="padding: 6px; background: rgba(59, 130, 246, 0.1);"><b>${c.placa}</b></td>
          <td style="padding: 6px;">${c.muc || '---'}</td>
          <td style="padding: 6px; color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="padding: 6px; color: #3b82f6; font-weight: bold;">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="padding: 6px;">${c.f_act || '---'}</td>
          
          <td style="padding: 6px;">
            <b style="color: #fbbf24;">${estadoLogisV20}</b>
          </td>
          
          <td style="padding: 6px;">
            <span style="background: ${estadoContable === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
              ${estadoContable}
            </span>
          </td>
          
          <td style="padding: 6px;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 10px; border-radius: 8px;">
          <h3 style="margin:0; color: #3b82f6;">YEGO CONTABLE vs LOGISV20</h3>
          <b style="color:#ef4444;">DEUDA: $ ${totalPendiente.toLocaleString('es-CO')}</b>
        </div>
        
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b;">
            <thead style="background:#1e40af; font-size: 10px;">
              <tr>
                <th>ID</th><th>REGISTRO</th><th>OFICINA</th><th>ORIGEN</th><th>DESTINO</th>
                <th>CLIENTE</th><th>CONTENEDOR</th><th>PEDIDO</th><th>PLACA</th><th>MUC</th>
                <th style="background:#064e3b">A PAGAR</th><th style="background:#1e3a8a">A FACTURAR</th>
                <th>ACTUALIZACIÓN</th>
                <th style="color:#fbbf24">ESTADO FINAL (LOGIS)</th>
                <th style="color:#10b981">ESTADO (CONTABLE)</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// Rutas de editar/guardar se mantienen igual...
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <div style="max-width:300px; margin:auto; background:#1e293b; padding:20px; border-radius:10px;">
        <h4 style="color:#10b981;">Liquidar #${req.params.id}</h4>
        <form action="/guardar/${req.params.id}" method="POST">
          <label>FLETE A PAGAR:</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; margin:10px 0; background:#0f172a; color:white;">
          <label>FLETE A FACTURAR:</label>
          <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:8px; margin:10px 0; background:#0f172a; color:white;">
          <label>ESTADO PAGO:</label>
          <select name="est_pago" style="width:100%; padding:8px; margin:10px 0; background:#0f172a; color:white;">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" style="width:100%; padding:10px; background:#10b981; color:white; border:none; cursor:pointer;">GUARDAR</button>
        </form>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO FINALIZADO')));
