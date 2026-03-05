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
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155">
          <td style="padding:12px">#${idReal}</td>
          <td><b>${c.placa || '---'}</b></td>
          <td>${c.cli || '---'}</td>
          <td>${c.f_d || '---'}</td>
          <td style="color:#10b981; font-weight:bold">$ ${fleteNum.toLocaleString('es-CO')}</td>
          <td style="color:${estado === 'PAGADO' ? '#10b981' : '#ef4444'}; font-weight:bold">${estado}</td>
          <td>${c.desp || '---'}</td>
          <td><a href="/editar/${idReal}" style="color:#3b82f6; text-decoration:none; font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #3b82f6; padding-bottom:10px; margin-bottom:20px">
          <h2 style="color:#3b82f6; margin:0">🚛 LOGÍSTICA YEGO - CONTABILIDAD</h2>
          <div style="background:#1e293b; padding:10px 20px; border-radius:10px; border:1px solid #ef4444">
            <small style="color:#94a3b8">POR PAGAR:</small><br>
            <b style="color:#ef4444; font-size:1.2em">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Buscar por placa..." style="width:100%; padding:12px; margin-bottom:20px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:white">

        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden">
          <thead style="background:#1e40af">
            <tr>
              <th style="padding:15px; text-align:left">ID</th>
              <th style="text-align:left">PLACA</th>
              <th style="text-align:left">CLIENTE</th>
              <th style="text-align:left">DESPACHO</th>
              <th style="text-align:left">VALOR FLETE</th>
              <th style="text-align:left">ESTADO</th>
              <th style="text-align:left">DESPACHADOR</th>
              <th style="text-align:left">ACCION</th>
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
  res.send(\`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:50px">
      <div style="max-width:350px; margin:auto; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6">
        <h3>Liquidar #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST">
          <label>VALOR FLETE (COP):</label>
          <input type="number" name="v_flete" value="\${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155">
          <label>ESTADO:</label>
          <select name="est_pago" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155">
            <option \${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option \${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; margin-top:10px">GUARDAR</button>
        </form>
        <p style="text-align:center"><a href="/" style="color:#94a3b8; text-decoration:none; font-size:12px">← Volver</a></p>
      </div>
    </body>\`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Operativo'));
