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

// MODELO EXPANDIDO CON TODAS LAS NUEVAS COLUMNAS
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_ant: { type: DataTypes.STRING },
  fecha_pago_ant: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cump_virtual: { type: DataTypes.DATEONLY },
  ent_manifiesto: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_remesa: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_hoja_tiempos: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_docs_cliente: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_facturas: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tirilla_vacio: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_cargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_descargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_cump_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_final: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  dias_sin_pagar: { type: DataTypes.INTEGER, defaultValue: 0 },
  dias_sin_cumplir: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fletePagar = Number(f.v_flete || 0);
      const fleteFacturar = Number(f.v_facturar || 0);
      const estadoContable = f.est_pago || "PENDIENTE";
      const estadoLogisV20 = c.est_real || '---';

      if(estadoContable === 'PENDIENTE') totalPendiente += fletePagar;

      const tdStyle = `padding: 8px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

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
          <td style="${tdStyle} color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6; font-weight: bold;">$${fleteFacturar.toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${c.f_act || '---'}</td>
          <td style="${tdStyle} color: #fbbf24;">${estadoLogisV20}</td>
          <td style="${tdStyle}">${f.tipo_anticipo || '---'}</td>
          <td style="${tdStyle}">$${Number(f.valor_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">$${Number(f.sobre_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${f.estado_ant || '---'}</td>
          <td style="${tdStyle}">${f.fecha_pago_ant || '---'}</td>
          <td style="${tdStyle}">${f.tipo_cumplido || '---'}</td>
          <td style="${tdStyle}">${f.fecha_cump_virtual || '---'}</td>
          <td style="${tdStyle}">${f.ent_manifiesto || 'NO'}</td>
          <td style="${tdStyle}">${f.ent_remesa || 'NO'}</td>
          <td style="${tdStyle}">${f.ent_hoja_tiempos || 'NO'}</td>
          <td style="${tdStyle}">${f.ent_docs_cliente || 'NO'}</td>
          <td style="${tdStyle}">${f.ent_facturas || 'NO'}</td>
          <td style="${tdStyle}">${f.ent_tirilla_vacio || 'NO'}</td>
          <td style="${tdStyle}">${f.ent_tiq_cargue || 'NO'}</td>
          <td style="${tdStyle}">${f.ent_tiq_descargue || 'NO'}</td>
          <td style="${tdStyle}">${f.presenta_novedades || 'NO'}</td>
          <td style="${tdStyle} max-width: 150px; overflow: hidden;">${f.obs_novedad || '---'}</td>
          <td style="${tdStyle} color: #ef4444;">$${Number(f.valor_descuento || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${f.fecha_cump_docs || '---'}</td>
          <td style="${tdStyle}">${f.fecha_legalizacion || '---'}</td>
          <td style="${tdStyle}">$${Number(f.retefuente || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">$${Number(f.reteica || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${Number(f.saldo_a_pagar || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${f.estado_final || '---'}</td>
          <td style="${tdStyle} color: #ef4444;">${f.dias_sin_pagar || 0}</td>
          <td style="${tdStyle} color: #3b82f6;">${f.dias_sin_cumplir || 0}</td>
          <td style="padding: 8px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    const thStyle = `padding: 12px 8px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6; white-space: nowrap;`;

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

        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 4000px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="${thStyle}">ID</th><th style="${thStyle}">REGISTRO</th><th style="${thStyle}">OFICINA</th>
                <th style="${thStyle}">ORIGEN</th><th style="${thStyle}">DESTINO</th><th style="${thStyle}">CLIENTE</th>
                <th style="${thStyle}">CONTENEDOR</th><th style="${thStyle}">PEDIDO</th><th style="${thStyle}">PLACA</th>
                <th style="${thStyle}">MUC</th><th style="${thStyle} background: #064e3b;">F. PAGAR</th>
                <th style="${thStyle} background: #1e3a8a;">F. FACTURAR</th><th style="${thStyle}">ACTUALIZACIÓN</th>
                <th style="${thStyle}">ESTADO LOGIS</th>
                <th style="${thStyle}">TIPO ANTICIPO</th><th style="${thStyle}">VALOR ANTICIPO</th>
                <th style="${thStyle}">SOBRE ANTICIPO</th><th style="${thStyle}">ESTADO ANT</th>
                <th style="${thStyle}">F. PAGO ANT</th><th style="${thStyle}">TIPO CUMPLIDO</th>
                <th style="${thStyle}">F. CUMP VIRTUAL</th><th style="${thStyle}">ENT. MANIFIESTO</th>
                <th style="${thStyle}">ENT. REMESA</th><th style="${thStyle}">ENT. HOJA TIEMPOS</th>
                <th style="${thStyle}">ENT. DOCS CLIENTE</th><th style="${thStyle}">ENT. FACTURAS</th>
                <th style="${thStyle}">ENT. TIRILLA</th><th style="${thStyle}">TIQ. CARGUE</th>
                <th style="${thStyle}">TIQ. DESCARGUE</th><th style="${thStyle}">NOVEDADES?</th>
                <th style="${thStyle}">OBS. NOVEDAD</th><th style="${thStyle}">VALOR DESC</th>
                <th style="${thStyle}">F. CUMP DOCS</th><th style="${thStyle}">F. LEGALIZACION</th>
                <th style="${thStyle}">RETEFUENTE</th><th style="${thStyle}">RETEICA</th>
                <th style="${thStyle}">SALDO A PAGAR</th><th style="${thStyle}">ESTADO FINAL</th>
                <th style="${thStyle}">DÍAS S. PAGAR</th><th style="${thStyle}">DÍAS S. CUMP</th>
                <th style="${thStyle}">ACCIÓN</th>
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
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding: 20px;">
      <div style="max-width:800px; margin:auto; background:#1e293b; padding:25px; border-radius:12px; border:1px solid #3b82f6;">
        <h3 style="color:#3b82f6; text-align: center;">Gestión Integral Carga #${req.params.id}</h3>
        <form action="/guardar/${req.params.id}" method="POST" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div><label>FLETE A PAGAR:</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155;"></div>
          <div><label>FLETE A FACTURAR:</label><input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155;"></div>
          
          <div><label>TIPO ANTICIPO:</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>VALOR ANTICIPO:</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          
          <div><label>SOBRE ANTICIPO:</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>FECHA PAGO ANT:</label><input type="date" name="fecha_pago_ant" value="${f.fecha_pago_ant||''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          
          <div style="grid-column: span 2; background: #0f172a; padding: 10px; border-radius: 5px;">
             <p style="margin:0 0 10px; color:#3b82f6; font-size: 12px;">ENTREGA DE DOCUMENTOS (SI/NO):</p>
             <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 10px;">
                <label>MANIFIESTO <input type="text" name="ent_manifiesto" value="${f.ent_manifiesto}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>REMESA <input type="text" name="ent_remesa" value="${f.ent_remesa}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>FACTURAS <input type="text" name="ent_facturas" value="${f.ent_facturas}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
                <label>TIQ. CARGUE <input type="text" name="ent_tiq_cargue" value="${f.ent_tiq_cargue}" style="width:100%; background:#1e293b; color:white; border:1px solid #334155;"></label>
             </div>
          </div>

          <div><label>SALDO A PAGAR:</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #10b981; font-weight:bold;"></div>
          <div><label>ESTADO FINAL:</label><input type="text" name="estado_final" value="${f.estado_final}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>

          <button type="submit" style="grid-column: span 2; padding:12px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; margin-top:10px;">GUARDAR GESTIÓN COMPLETA</button>
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
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GRID FULL EXPANDED')));
