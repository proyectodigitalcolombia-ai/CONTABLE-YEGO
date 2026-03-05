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

// Modelo extendido para incluir flete a facturar
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // Flete a Pagar
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }, // Flete a Facturar
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      const fletePagar = f ? Number(f.v_flete) : 0;
      const fleteFacturar = f ? Number(f.v_facturar) : 0;
      const estado = f ? f.est_pago : "PENDIENTE";
      if(estado === 'PENDIENTE') totalPendiente += fletePagar;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 12px;">
          <td style="padding: 8px; color: #94a3b8;">${c.id}</td>
          <td style="padding: 8px;">${c.f_doc || '---'}</td>
          <td style="padding: 8px;">${c.oficina || '---'}</td>
          <td style="padding: 8px;">${c.orig || '---'}</td>
          <td style="padding: 8px;">${c.dest || '---'}</td>
          <td style="padding: 8px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${c.cli || '---'}</td>
          <td style="padding: 8px;">${c.cont || '---'}</td>
          <td style="padding: 8px;">${c.ped || '---'}</td>
          <td style="padding: 8px; background: rgba(59, 130, 246, 0.1);"><b>${c.placa || ''}</b></td>
          <td style="padding: 8px;">${c.muc || '---'}</td>
          <td style="padding: 8px; color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="padding: 8px; color: #3b82f6; font-weight: bold;">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="padding: 8px; font-size: 10px; color: #94a3b8;">${c.f_act || '---'}</td>
          <td style="padding: 8px;">
            <span style="background: ${estado === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${estado}</span>
          </td>
          <td style="padding: 8px;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[ACTUALIZAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:20px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; background: #1e293b; padding: 15px; border-radius: 10px; border-bottom: 3px solid #10b981;">
          <div>
            <h2 style="margin:0; color: #10b981; font-size: 18px;">YEGO FINANZAS</h2>
            <small style="color: #94a3b8;">Módulo de Liquidación y Facturación</small>
          </div>
          <div style="text-align: right;">
            <span style="color:#94a3b8; font-size: 12px;">TOTAL PENDIENTE (PAGOS):</span><br>
            <b style="color:#ef4444; font-size: 22px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Buscar por placa..." style="width:100%; padding:10px; margin-bottom:20px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:white;">

        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden;">
            <thead style="background:#1e40af; color: white; font-size: 11px; text-transform: uppercase;">
              <tr>
                <th style="padding:12px 8px; text-align:left;">ID</th>
                <th style="text-align:left;">FECHA REGISTRO</th>
                <th style="text-align:left;">OFICINA</th>
                <th style="text-align:left;">ORIGEN</th>
                <th style="text-align:left;">DESTINO</th>
                <th style="text-align:left;">CLIENTE</th>
                <th style="text-align:left;">NRO CONTENEDOR</th>
                <th style="text-align:left;">PEDIDO</th>
                <th style="text-align:left;">PLACA</th>
                <th style="text-align:left;">MUC</th>
                <th style="text-align:left;">FLETE A PAGAR</th>
                <th style="text-align:left;">FLETE A FACTURAR</th>
                <th style="text-align:left;">ACTUALIZACIÓN</th>
                <th style="text-align:left;">ESTADO FINAL</th>
                <th style="text-align:left;">GESTIÓN</th>
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

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:40px;">
      <div style="max-width:350px; margin:auto; background:#1e293b; padding:25px; border-radius:15px; border:1px solid #10b981;">
        <h3 style="margin-top:0; color:#10b981;">Liquidar Servicio #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST">
          <label style="font-size: 12px; color:#94a3b8;">FLETE A PAGAR (CONDUCTOR):</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:#10b981; border:1px solid #334155; border-radius:5px; font-weight:bold; font-size:16px;">
          
          <label style="font-size: 12px; color:#94a3b8;">FLETE A FACTURAR (CLIENTE):</label>
          <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:#3b82f6; border:1px solid #334155; border-radius:5px; font-weight:bold; font-size:16px;">
          
          <label style="font-size: 12px; color:#94a3b8;">ESTADO DE PAGO:</label>
          <select name="est_pago" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" style="width:100%; padding:12px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; margin-top:15px;">GUARDAR CAMBIOS</button>
        </form>
        <p style="text-align:center; margin-top:20px;"><a href="/" style="color:#94a3b8; text-decoration:none; font-size:12px;">← Volver al listado</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 YEGO FINANZAS OPERATIVO')));
