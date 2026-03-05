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
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' AND placa != '---' ORDER BY id DESC LIMIT 100`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const idReal = c.id; 
      const f = finanzas.find(fin => fin.cargaId === idReal);
      const fleteNum = f ? Number(f.v_flete) : 0;
      const estado = f ? f.est_pago : "PENDIENTE";
      if(estado === 'PENDIENTE') totalPendiente += fleteNum;

      // EL ORDEN DE ESTOS <td> DEBE COINCIDIR EXACTAMENTE CON EL <thead>
      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 10px; white-space: nowrap;">
          <td style="padding: 4px;">${c.id}</td>
          <td style="padding: 4px;"><b>${c.placa || ''}</b></td>
          <td style="padding: 4px;">${c.comercial || ''}</td>
          <td style="padding: 4px;">${c.peso || ''}</td>
          <td style="padding: 4px;">${c.oficina || ''}</td>
          <td style="padding: 4px;">${c.muc || ''}</td>
          <td style="padding: 4px;">${c.emp_gen || ''}</td>
          <td style="padding: 4px;">${c.pto || ''}</td>
          <td style="padding: 4px;">${c.refleja || ''}</td>
          <td style="padding: 4px;">${c.f_doc || ''}</td>
          <td style="padding: 4px;">${c.h_doc || ''}</td>
          <td style="padding: 4px;">${c.do_bl || ''}</td>
          <td style="padding: 4px;">${c.cli || ''}</td>
          <td style="padding: 4px;">${c.subc || ''}</td>
          <td style="padding: 4px;">${c.mod || ''}</td>
          <td style="padding: 4px;">${c.lcl || ''}</td>
          <td style="padding: 4px;">${c.cont || ''}</td>
          <td style="padding: 4px;">${c.unid || ''}</td>
          <td style="padding: 4px;">${c.prod || ''}</td>
          <td style="padding: 4px;">${c.esq || ''}</td>
          <td style="padding: 4px;">${c.vence || ''}</td>
          <td style="padding: 4px;">${c.orig || ''}</td>
          <td style="padding: 4px;">${c.dest || ''}</td>
          <td style="padding: 4px;">${c.t_v || ''}</td>
          <td style="padding: 4px;">${c.ped || ''}</td>
          <td style="padding: 4px;">${c.f_c || ''}</td>
          <td style="padding: 4px;">${c.h_c || ''}</td>
          <td style="padding: 4px;">${c.f_d || ''}</td>
          <td style="padding: 4px;">${c.h_d || ''}</td>
          <td style="padding: 4px;">${c.f_p || ''}</td>
          <td style="padding: 4px;">${c.f_f || ''}</td>
          <td style="padding: 4px;">${c.obs_e || ''}</td>
          <td style="padding: 4px;">${c.f_act || ''}</td>
          <td style="padding: 4px;">${c.obs || ''}</td>
          <td style="padding: 4px;">${c.cond || ''}</td>
          <td style="padding: 4px;">${c.h_t || ''}</td>
          <td style="padding: 4px;">${c.desp || ''}</td>
          <td style="padding: 4px;">${c.f_fin || ''}</td>
          <td style="padding: 4px; color: #fbbf24;">${c.est_real || ''}</td>
          
          <td style="padding: 4px; color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.1); border-left: 2px solid #3b82f6;">$${fleteNum.toLocaleString('es-CO')}</td>
          <td style="padding: 4px; background: rgba(16, 185, 129, 0.1);">
            <span style="background: ${estado === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 2px 4px; border-radius: 3px; font-size: 9px;">${estado}</span>
          </td>
          <td style="padding: 4px;">
            <a href="/editar/${idReal}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:10px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background: #1e293b; padding: 8px; border-radius: 6px; border-bottom: 2px solid #3b82f6;">
          <h3 style="margin:0; font-size: 14px; color: #3b82f6;">🚛 YEGO LOGÍSTICA V20 INTEGRADA</h3>
          <b style="color:#ef4444; font-size: 14px;">POR PAGAR: $ ${totalPendiente.toLocaleString('es-CO')}</b>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Filtrar placa..." style="width:100%; padding:6px; margin-bottom:10px; border-radius:4px; border:1px solid #334155; background:#1e293b; color:white; font-size: 12px;">

        <div style="overflow-x: auto; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b;">
            <thead style="background:#1e40af; font-size: 9px; text-transform: uppercase; white-space: nowrap;">
              <tr>
                <th style="padding:8px; text-align:left;">ID</th>
                <th style="text-align:left;">PLACA</th>
                <th style="text-align:left;">COMERCIAL</th>
                <th style="text-align:left;">PESO</th>
                <th style="text-align:left;">OFICINA</th>
                <th style="text-align:left;">MUC</th>
                <th style="text-align:left;">EMP_GEN</th>
                <th style="text-align:left;">PTO</th>
                <th style="text-align:left;">REFLEJA</th>
                <th style="text-align:left;">F_DOC</th>
                <th style="text-align:left;">H_DOC</th>
                <th style="text-align:left;">DO_BL</th>
                <th style="text-align:left;">CLI</th>
                <th style="text-align:left;">SUBC</th>
                <th style="text-align:left;">MOD</th>
                <th style="text-align:left;">LCL</th>
                <th style="text-align:left;">CONT</th>
                <th style="text-align:left;">UNID</th>
                <th style="text-align:left;">PROD</th>
                <th style="text-align:left;">ESQ</th>
                <th style="text-align:left;">VENCE</th>
                <th style="text-align:left;">ORIG</th>
                <th style="text-align:left;">DEST</th>
                <th style="text-align:left;">T_V</th>
                <th style="text-align:left;">PED</th>
                <th style="text-align:left;">F_C</th>
                <th style="text-align:left;">H_C</th>
                <th style="text-align:left;">F_D</th>
                <th style="text-align:left;">H_D</th>
                <th style="text-align:left;">F_P</th>
                <th style="text-align:left;">F_F</th>
                <th style="text-align:left;">OBS_E</th>
                <th style="text-align:left;">F_ACT</th>
                <th style="text-align:left;">OBS</th>
                <th style="text-align:left;">COND</th>
                <th style="text-align:left;">H_T</th>
                <th style="text-align:left;">DESP</th>
                <th style="text-align:left;">F_FIN</th>
                <th style="text-align:left;">EST_REAL</th>
                <th style="text-align:left; background: #064e3b; color: #fff;">VALOR FLETE</th>
                <th style="text-align:left; background: #064e3b; color: #fff;">ESTADO PAGO</th>
                <th style="text-align:left;">ACCIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>

        <script>
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(fila => {
              fila.style.display = fila.getAttribute('data-placa').includes(term) ? '' : 'none';
            });
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// Rutas de edición se mantienen igual...
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <div style="max-width:300px; margin:auto; background:#1e293b; padding:20px; border-radius:10px; border:1px solid #3b82f6;">
        <h4 style="margin-top:0;">Liquidar #${req.params.id}</h4>
        <form action="/guardar/${req.params.id}" method="POST">
          <label style="font-size: 12px;">VALOR FLETE:</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; margin:8px 0; background:#0f172a; color:#10b981; border:1px solid #334155; border-radius:4px; font-weight:bold;">
          <label style="font-size: 12px;">ESTADO:</label>
          <select name="est_pago" style="width:100%; padding:8px; margin:8px 0; background:#0f172a; color:white; border:1px solid #334155; border-radius:4px;">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" style="width:100%; padding:10px; background:#2563eb; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; margin-top:10px;">GUARDAR</button>
        </form>
        <p style="text-align:center;"><a href="/" style="color:#94a3b8; text-decoration:none; font-size:11px;">← Volver</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 YEGO V20 ORDEN EXACTO')));
