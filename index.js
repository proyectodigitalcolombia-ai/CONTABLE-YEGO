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
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      const fletePagar = f ? Number(f.v_flete) : 0;
      const fleteFacturar = f ? Number(f.v_facturar) : 0;
      const estadoContable = f ? f.est_pago : "PENDIENTE";
      const estadoLogisV20 = c.est_real || '---';

      if(estadoContable === 'PENDIENTE') totalPendiente += fletePagar;

      // Estilo común para celdas centradas y con líneas verticales
      const tdStyle = `padding: 8px; text-align: center; border-right: 1px solid #334155;`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle} color: #94a3b8;">#${c.id}</td>
          <td style="${tdStyle}">${c.f_doc || '---'}</td>
          <td style="${tdStyle}">${c.oficina || '---'}</td>
          <td style="${tdStyle}">${c.orig || '---'}</td>
          <td style="${tdStyle}">${c.dest || '---'}</td>
          <td style="${tdStyle} max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${c.cli || '---'}</td>
          <td style="${tdStyle}">${c.cont || '---'}</td>
          <td style="${tdStyle}">${c.ped || '---'}</td>
          <td style="${tdStyle} background: rgba(59, 130, 246, 0.1); font-weight: bold; color: #fff;">${c.placa}</td>
          <td style="${tdStyle}">${c.muc || '---'}</td>
          <td style="${tdStyle} color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.05);">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6; font-weight: bold; background: rgba(59, 130, 246, 0.05);">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${c.f_act || '---'}</td>
          <td style="${tdStyle} font-weight: bold; color: #fbbf24;">${estadoLogisV20}</td>
          <td style="${tdStyle}">
            <span style="background: ${estadoContable === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 3px 8px; border-radius: 4px; font-size: 10px;">
              ${estadoContable}
            </span>
          </td>
          <td style="padding: 8px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    // Estilo para los encabezados centrados con líneas
    const thStyle = `padding: 12px 8px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6;`;

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <div>
            <h2 style="margin:0; color: #3b82f6; font-size: 18px;">YEGO SISTEMA CONTABLE</h2>
            <small style="color: #94a3b8;">Sincronizado con LogisV20</small>
          </div>
          <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 5px 15px; border-radius: 6px; border: 1px solid #ef4444;">
            <small style="color:#ef4444; font-weight: bold;">TOTAL POR PAGAR:</small><br>
            <b style="color:#f1f5f9; font-size: 20px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Filtrar por placa..." style="width:100%; padding:10px; margin-bottom:15px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white; outline: none; box-sizing: border-box;">

        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 1400px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
              <tr>
                <th style="${thStyle}">ID</th>
                <th style="${thStyle}">REGISTRO</th>
                <th style="${thStyle}">OFICINA</th>
                <th style="${thStyle}">ORIGEN</th>
                <th style="${thStyle}">DESTINO</th>
                <th style="${thStyle}">CLIENTE</th>
                <th style="${thStyle}">CONTENEDOR</th>
                <th style="${thStyle}">PEDIDO</th>
                <th style="${thStyle}">PLACA</th>
                <th style="${thStyle}">MUC</th>
                <th style="${thStyle} background: #064e3b;">F. PAGAR</th>
                <th style="${thStyle} background: #1e3a8a;">F. FACTURAR</th>
                <th style="${thStyle}">ACTUALIZACIÓN</th>
                <th style="${thStyle} color: #fbbf24;">ESTADO FINAL (LOGIS)</th>
                <th style="${thStyle} color: #10b981;">ESTADO (PAGOS)</th>
                <th style="padding:12px 8px; text-align: center; border-bottom: 2px solid #3b82f6;">ACCIÓN</th>
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

// Rutas de edición y guardado se mantienen igual...
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
      <div style="width:320px; background:#1e293b; padding:25px; border-radius:12px; border:1px solid #3b82f6; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
        <h3 style="margin-top:0; color:#3b82f6; text-align: center;">Liquidar #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST">
          <label style="font-size: 11px; color: #94a3b8;">FLETE A PAGAR:</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:5px 0 15px; background:#0f172a; color:#10b981; border:1px solid #334155; border-radius:6px; font-weight:bold; box-sizing: border-box;">
          
          <label style="font-size: 11px; color: #94a3b8;">FLETE A FACTURAR:</label>
          <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:10px; margin:5px 0 15px; background:#0f172a; color:#3b82f6; border:1px solid #334155; border-radius:6px; font-weight:bold; box-sizing: border-box;">
          
          <label style="font-size: 11px; color: #94a3b8;">ESTADO DEL PAGO:</label>
          <select name="est_pago" style="width:100%; padding:10px; margin:5px 0 20px; background:#0f172a; color:white; border:1px solid #334155; border-radius:6px; box-sizing: border-box;">
            <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          <button type="submit" style="width:100%; padding:12px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">GUARDAR REGISTRO</button>
        </form>
        <p style="text-align:center; margin-top:15px;"><a href="/" style="color:#94a3b8; text-decoration:none; font-size:12px;">← Volver al listado</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GRID COMPLETO')));
