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

// MODELO EXTENDIDO PARA GESTIÓN MANUAL
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  // NUEVOS CAMPOS DE GESTIÓN
  nro_factura: { type: DataTypes.STRING },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT },
  referencia_soporte: { type: DataTypes.STRING }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPagar = 0;
    let totalFacturar = 0;

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      const fletePagar = f ? Number(f.v_flete) : 0;
      const fleteFacturar = f ? Number(f.v_facturar) : 0;
      const estadoContable = f ? f.est_pago : "PENDIENTE";
      const factura = f ? (f.nro_factura || '---') : '---';

      if(estadoContable === 'PENDIENTE') totalPagar += fletePagar;
      totalFacturar += fleteFacturar;

      const tdStyle = `padding: 8px; text-align: center; border-right: 1px solid #334155;`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px; background: ${estadoContable === 'PAGADO' ? 'rgba(16, 185, 129, 0.03)' : 'transparent'};">
          <td style="${tdStyle} color: #94a3b8;">#${c.id}</td>
          <td style="${tdStyle}">${c.f_doc || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle} font-weight: bold;">${c.placa}</td>
          <td style="${tdStyle} color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6; font-weight: bold;">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #fbbf24; font-weight: bold;">${factura}</td>
          <td style="${tdStyle} font-weight: bold; color: #fbbf24;">${c.est_real || '---'}</td>
          <td style="${tdStyle}">
            <span style="background: ${estadoContable === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding: 3px 8px; border-radius: 4px; font-size: 10px;">
              ${estadoContable}
            </span>
          </td>
          <td style="padding: 8px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold; background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 15px; border-radius: 10px; border: 1px solid #334155;">
          <div>
            <h2 style="margin:0; color: #3b82f6;">YEGO ERP CONTABLE</h2>
          </div>
          <div style="display: flex; gap: 20px;">
            <div style="text-align: right;">
              <small style="color:#ef4444;">POR PAGAR:</small><br>
              <b style="font-size: 18px;">$ ${totalPagar.toLocaleString('es-CO')}</b>
            </div>
            <div style="text-align: right; border-left: 1px solid #334155; padding-left: 20px;">
              <small style="color:#3b82f6;">POR FACTURAR:</small><br>
              <b style="font-size: 18px;">$ ${totalFacturar.toLocaleString('es-CO')}</b>
            </div>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Buscar por placa o cliente..." style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:white;">

        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 1200px;">
            <thead style="background:#1e40af; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="padding:12px; border-right: 1px solid #475569;">ID</th>
                <th style="border-right: 1px solid #475569;">REGISTRO</th>
                <th style="border-right: 1px solid #475569;">CLIENTE</th>
                <th style="border-right: 1px solid #475569;">PLACA</th>
                <th style="border-right: 1px solid #475569; background:#064e3b">V. FLETE</th>
                <th style="border-right: 1px solid #475569; background:#1e3a8a">V. FACTURA</th>
                <th style="border-right: 1px solid #475569; color: #fbbf24;">N° FACTURA</th>
                <th style="border-right: 1px solid #475569;">ESTADO LOG.</th>
                <th style="border-right: 1px solid #475569;">ESTADO PAGO</th>
                <th>GESTIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>
        <script>
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(fila => {
              fila.style.display = fila.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// FORMULARIO DE GESTIÓN MANUAL AVANZADO
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px; display:flex; justify-content:center;">
      <div style="width:100%; max-width:500px; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <h2 style="color:#3b82f6; margin-top:0; text-align:center; border-bottom: 1px solid #334155; padding-bottom:10px;">Liquidación de Carga #${req.params.id}</h2>
        
        <form action="/guardar/${req.params.id}" method="POST" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          
          <div style="grid-column: span 1;">
            <label style="font-size:11px; color:#94a3b8;">FLETE CONDUCTOR ($)</label>
            <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; background:#0f172a; color:#10b981; border:1px solid #334155; border-radius:5px; font-weight:bold;">
          </div>

          <div style="grid-column: span 1;">
            <label style="font-size:11px; color:#94a3b8;">VALOR A FACTURAR ($)</label>
            <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:10px; background:#0f172a; color:#3b82f6; border:1px solid #334155; border-radius:5px; font-weight:bold;">
          </div>

          <div style="grid-column: span 1;">
            <label style="font-size:11px; color:#94a3b8;">NRO FACTURA</label>
            <input type="text" name="nro_factura" value="${f.nro_factura || ''}" placeholder="FAC-000" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;">
          </div>

          <div style="grid-column: span 1;">
            <label style="font-size:11px; color:#94a3b8;">FECHA DE PAGO</label>
            <input type="date" name="fecha_pago_real" value="${f.fecha_pago_real || ''}" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;">
          </div>

          <div style="grid-column: span 2;">
            <label style="font-size:11px; color:#94a3b8;">ESTADO DE PAGO</label>
            <select name="est_pago" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px;">
              <option ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
              <option ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
              <option ${f.est_pago === 'ANULADO' ? 'selected' : ''}>ANULADO</option>
            </select>
          </div>

          <div style="grid-column: span 2;">
            <label style="font-size:11px; color:#94a3b8;">OBSERVACIONES / SOPORTE</label>
            <textarea name="obs_contable" rows="3" style="width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #334155; border-radius:5px; resize:none;">${f.obs_contable || ''}</textarea>
          </div>

          <button type="submit" style="grid-column: span 2; padding:15px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:16px;">GUARDAR GESTIÓN MANUAL</button>
        </form>
        <p style="text-align:center; margin-top:20px;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al Tablero</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GESTIÓN MANUAL ACTIVADA')));
