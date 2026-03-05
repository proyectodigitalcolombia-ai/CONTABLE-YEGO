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
    const cargas = await db.query('SELECT * FROM "Cargas" ORDER BY id DESC LIMIT 150', { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const idReal = c.id; 
      const f = finanzas.find(fin => fin.cargaId === idReal);
      const fleteNum = f ? Number(f.v_flete) : 0;
      const estado = f ? f.est_pago : "PENDIENTE";
      
      if(estado === 'PENDIENTE') totalPendiente += fleteNum;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 12px;">
          <td style="padding: 5px 8px; color: #94a3b8;">#${idReal}</td>
          <td style="padding: 5px 8px;"><b>${c.placa || '---'}</b></td>
          <td style="padding: 5px 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.cli || '---'}</td>
          <td style="padding: 5px 8px;">${c.f_d || '---'}</td>
          <td style="padding: 5px 8px; color: #10b981; font-weight: bold;">$${fleteNum.toLocaleString('es-CO')}</td>
          <td style="padding: 5px 8px;">
            <span style="background: ${estado === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${estado}</span>
          </td>
          <td style="padding: 5px 8px; font-size: 11px; color: #94a3b8;">${c.desp || '---'}</td>
          <td style="padding: 5px 8px;">
            <a href="/editar/${idReal}" style="color: #3b82f6; text-decoration: none; font-weight: bold; font-size: 11px;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 10px; border-radius: 8px;">
          <h3 style="color:#3b82f6; margin:0; font-size: 16px;">🚛 YEGO CONTABLE V20</h3>
          <div style="text-align: right;">
            <small style="color:#94a3b8; font-size: 10px;">POR PAGAR:</small><br>
            <b style="color:#ef4444; font-size: 16px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Filtrar placa..." style="width:100%; padding:8px; margin-bottom:15px; border-radius:5px; border:1px solid #334155; background:#1e293b; color:white; font-size: 13px;">

        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:5px; overflow:hidden;">
          <thead style="background:#1e40af; font-size: 12px;">
            <tr>
              <th style="padding:10px 8px; text-align:left;">ID</th>
              <th style="text-align:left;">PLACA</th>
              <th style="text-align:left;">CLIENTE</th>
              <th style="text-align:left;">DESPACHO</th>
              <th style="text-align:left;">FLETE</th>
              <th style="text-align:left;">ESTADO</th>
              <th style="text-align:left;">DESP.</th>
              <th style="text-align:left;">ACCIÓN</th>
            </tr>
          </thead>
          <tbody id="tabla-cargas">${filas}</tbody>
        </table>

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

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:30px;">
      <div style="max-width:300px; margin:auto; background:#1e293b; padding:20px; border-radius:10px; border:1px solid #3b82f6;">
        <h4 style="margin-top:0;">Liquidación #${req.params.id}</h4>
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
        <p style="text-align:center;"><a href="/" style="color:#94a3b8; text-decoration:none; font-size:11px;">← Cancelar</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 YEGO V20 Compacto')));
