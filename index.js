const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

// Middlewares para procesamiento de datos (NODE_VERSION 20)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Conexión a Base de Datos
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// --- MODELO EXTENDIDO (TODOS LOS CAMPOS MANUALES) ---
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
  // Bloque de Documentación
  ent_manifiesto: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_remesa: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_hoja_tiempos: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_docs_cliente: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_facturas: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tirilla_vacio: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_cargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  ent_tiq_descargue: { type: DataTypes.STRING, defaultValue: 'NO' },
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  // Bloque de Cierre
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

// Ayudante visual para la tabla
const fV = (v) => {
  const s = String(v || 'NO').toUpperCase().trim();
  return s === 'SI' ? '<b style="color:#10b981;">✅ SI</b>' : '<b style="color:#ef4444;">❌ NO</b>';
};

// --- RUTA PRINCIPAL (LISTADO MASIVO) ---
app.get('/', async (req, res) => {
  try {
    const cargas = await db.query(`SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    const filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const flete = Number(f.v_flete || 0);
      if((f.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += flete;

      const td = `padding: 12px 8px; text-align: center; border-right: 1px solid #334155; white-space: nowrap; font-size: 11px;`;

      return `
        <tr class="fila" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155;">
          <td style="${td}">${c.id}</td>
          <td style="${td}">${c.f_doc || ''}</td><td style="${td}">${c.oficina || ''}</td>
          <td style="${td}">${c.orig || ''}</td><td style="${td}">${c.dest || ''}</td>
          <td style="${td}">${c.cli || ''}</td><td style="${td}">${c.cont || ''}</td>
          <td style="${td}">${c.ped || ''}</td>
          <td style="${td} background:rgba(59,130,246,0.1); font-weight:bold; color:#60a5fa;">${c.placa}</td>
          <td style="${td}">${c.muc || ''}</td>
          <td style="${td} color:#10b981;">$${flete.toLocaleString('es-CO')}</td>
          <td style="${td}">$${Number(f.v_facturar||0).toLocaleString('es-CO')}</td>
          <td style="${td}">${c.f_act || ''}</td>
          <td style="${td} color:#fbbf24;">${c.est_real || ''}</td>
          <td style="${td}">${f.tipo_anticipo || ''}</td>
          <td style="${td}">$${Number(f.valor_anticipo||0).toLocaleString('es-CO')}</td>
          <td style="${td}">$${Number(f.sobre_anticipo||0).toLocaleString('es-CO')}</td>
          <td style="${td}">${f.estado_ant || ''}</td>
          <td style="${td}">${f.fecha_pago_ant || ''}</td>
          <td style="${td}">${f.tipo_cumplido || ''}</td>
          <td style="${td}">${f.fecha_cump_virtual || ''}</td>
          <td style="${td}">${fV(f.ent_manifiesto)}</td>
          <td style="${td}">${fV(f.ent_remesa)}</td>
          <td style="${td}">${fV(f.ent_hoja_tiempos)}</td>
          <td style="${td}">${fV(f.ent_docs_cliente)}</td>
          <td style="${td}">${fV(f.ent_facturas)}</td>
          <td style="${td}">${fV(f.ent_tirilla_vacio)}</td>
          <td style="${td}">${fV(f.ent_tiq_cargue)}</td>
          <td style="${td}">${fV(f.ent_tiq_descargue)}</td>
          <td style="${td}">${fV(f.presenta_novedades)}</td>
          <td style="${td}">${f.obs_novedad || ''}</td>
          <td style="${td} color:#ef4444;">$${Number(f.valor_descuento||0).toLocaleString('es-CO')}</td>
          <td style="${td}">${f.fecha_cump_docs || ''}</td>
          <td style="${td}">${f.fecha_legalizacion || ''}</td>
          <td style="${td}">$${Number(f.retefuente||0).toLocaleString('es-CO')}</td>
          <td style="${td}">$${Number(f.reteica||0).toLocaleString('es-CO')}</td>
          <td style="${td} background:rgba(16,185,129,0.1); font-weight:bold;">$${Number(f.saldo_a_pagar||0).toLocaleString('es-CO')}</td>
          <td style="${td}">${f.estado_final || 'PENDIENTE'}</td>
          <td style="${td}">${f.dias_sin_pagar || 0}</td>
          <td style="${td}">${f.dias_sin_cumplir || 0}</td>
          <td style="padding:10px; text-align:center;">
            <a href="/editar/${c.id}" style="background:#3b82f6; color:white; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:10px; font-weight:bold;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:20px; border-radius:12px; border:1px solid #334155; margin-bottom:20px;">
          <h1 style="margin:0; color:#3b82f6;">YEGO FINANZAS <span style="font-weight:100; color:#94a3b8;">| 2026</span></h1>
          <div style="text-align:right; background:rgba(16,185,129,0.1); padding:10px 20px; border-radius:8px; border:1px solid #10b981;">
            <small style="color:#10b981; font-weight:bold;">TOTAL POR PAGAR</small><br>
            <b style="font-size:24px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>
        <input type="text" id="busc" placeholder="🔍 Filtrar por placa..." style="width:100%; padding:15px; background:#1e293b; color:white; border:1px solid #334155; border-radius:8px; margin-bottom:20px; font-size:16px;">
        <div style="overflow-x:auto; border-radius:12px; border:1px solid #334155; background:#1e293b;">
          <table style="width:100%; border-collapse:collapse; min-width:6500px;">
            <thead style="background:#1e40af; color:white; font-size:10px; text-transform:uppercase;">
              <tr>
                <th style="padding:15px;">ID</th><th>REGISTRO</th><th>OFICINA</th><th>ORIGEN</th><th>DESTINO</th><th>CLIENTE</th><th>CONT</th><th>PEDIDO</th><th>PLACA</th><th>MUC</th><th>V. FLETE</th><th>V. FACTURAR</th><th>ACTUALIZACION</th><th>LOGISTICO</th><th>T. ANTICIPO</th><th>V. ANTICIPO</th><th>S. ANTICIPO</th><th>E. ANTICIPO</th><th>F. PAGO ANT</th><th>T. CUMPLIDO</th><th>F. VIRTUAL</th><th>MANIF</th><th>REME</th><th>HOJA</th><th>D.CLI</th><th>FACT</th><th>TIRI</th><th>T.CARG</th><th>T.DESC</th><th>NOVED</th><th>OBSERVACION</th><th>DESC</th><th>F. DOCS</th><th>F. LEGA</th><th>RET.F</th><th>RET.I</th><th>SALDO</th><th>ESTADO</th><th>M. PAG</th><th>M. CUM</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody id="tabla">${filas}</tbody>
          </table>
        </div>
        <script>
          document.getElementById('busc').addEventListener('input', (e) => {
            const v = e.target.value.toLowerCase();
            document.querySelectorAll('.fila').forEach(tr => {
              tr.style.display = tr.getAttribute('data-placa').includes(v) ? '' : 'none';
            });
          });
        </script>
      </body>`);
  } catch (e) { res.status(500).send(e.message); }
});

// --- RUTA DE EDICIÓN (FORMULARIO ROBUSTO) ---
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  const iS = `width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #475569; border-radius:6px; margin-top:5px; outline:none; font-size:13px;`;
  const lS = `font-size:11px; color:#94a3b8; font-weight:bold; text-transform:uppercase;`;

  res.send(`
    <body style="background:#0f172a; color:white; font-family:sans-serif; padding:20px;">
      <div style="max-width:1200px; margin:auto; background:#1e293b; padding:40px; border-radius:15px; border:1px solid #3b82f6; box-shadow:0 0 50px rgba(0,0,0,0.5);">
        <h2 style="text-align:center; color:#3b82f6; margin-bottom:30px;">GESTIÓN INTEGRAL DE CARGA #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST">
          
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; margin-bottom:30px; border-bottom:1px solid #334155; padding-bottom:20px;">
            <h4 style="grid-column:span 4; color:#3b82f6; margin:0;">1. VALORES Y ANTICIPOS</h4>
            <div><label style="${lS}">V. Flete Pagar</label><input type="number" step="0.01" name="v_flete" value="${f.v_flete}" style="${iS}"></div>
            <div><label style="${lS}">V. Facturar</label><input type="number" step="0.01" name="v_facturar" value="${f.v_facturar}" style="${iS}"></div>
            <div><label style="${lS}">Estado Pago</label><input type="text" name="est_pago" value="${f.est_pago}" style="${iS}"></div>
            <div><label style="${lS}">Tipo Anticipo</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo||''}" style="${iS}"></div>
            <div><label style="${lS}">Valor Anticipo</label><input type="number" step="0.01" name="valor_anticipo" value="${f.valor_anticipo}" style="${iS}"></div>
            <div><label style="${lS}">Sobre Anticipo</label><input type="number" step="0.01" name="sobre_anticipo" value="${f.sobre_anticipo}" style="${iS}"></div>
            <div><label style="${lS}">Estado Ant.</label><input type="text" name="estado_ant" value="${f.estado_ant||''}" style="${iS}"></div>
            <div><label style="${lS}">Fecha Pago Ant.</label><input type="date" name="fecha_pago_ant" value="${f.fecha_pago_ant||''}" style="${iS}"></div>
          </div>

          <div style="background:rgba(15,23,42,0.4); padding:20px; border-radius:10px; border:1px solid #334155; margin-bottom:30px;">
            <h4 style="color:#10b981; margin:0 0 20px 0;">2. CONTROL DE DOCUMENTOS (SI / NO)</h4>
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:15px;">
              <div><label style="${lS}">Manifiesto</label><input type="text" name="ent_manifiesto" value="${f.ent_manifiesto}" style="${iS}"></div>
              <div><label style="${lS}">Remesa</label><input type="text" name="ent_remesa" value="${f.ent_remesa}" style="${iS}"></div>
              <div><label style="${lS}">Hoja Tiempos</label><input type="text" name="ent_hoja_tiempos" value="${f.ent_hoja_tiempos}" style="${iS}"></div>
              <div><label style="${lS}">Docs Cliente</label><input type="text" name="ent_docs_cliente" value="${f.ent_docs_cliente}" style="${iS}"></div>
              <div><label style="${lS}">Facturas</label><input type="text" name="ent_facturas" value="${f.ent_facturas}" style="${iS}"></div>
              <div><label style="${lS}">Tirilla Vacío</label><input type="text" name="ent_tirilla_vacio" value="${f.ent_tirilla_vacio}" style="${iS}"></div>
              <div><label style="${lS}">Tiq. Cargue</label><input type="text" name="ent_tiq_cargue" value="${f.ent_tiq_cargue}" style="${iS}"></div>
              <div><label style="${lS}">Tiq. Descargue</label><input type="text" name="ent_tiq_descargue" value="${f.ent_tiq_descargue}" style="${iS}"></div>
              <div><label style="${lS}">¿Novedades?</label><input type="text" name="presenta_novedades" value="${f.presenta_novedades}" style="${iS}"></div>
              <div><label style="${lS}">Tipo Cumplido</label><input type="text" name="tipo_cumplido" value="${f.tipo_cumplido||''}" style="${iS}"></div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:20px; margin-bottom:30px;">
            <h4 style="grid-column:span 4; color:#3b82f6; margin:0;">3. LIQUIDACIÓN Y CIERRE</h4>
            <div><label style="${lS}">Obs. Novedad</label><textarea name="obs_novedad" style="${iS} height:80px;">${f.obs_novedad||''}</textarea></div>
            <div>
              <label style="${lS}">Valor Descuento</label><input type="number" step="0.01" name="valor_descuento" value="${f.valor_descuento}" style="${iS} border-color:#ef4444;">
              <label style="${lS}">Retefuente</label><input type="number" step="0.01" name="retefuente" value="${f.retefuente}" style="${iS}">
            </div>
            <div>
              <label style="${lS}">Fecha Cumplido</label><input type="date" name="fecha_cump_docs" value="${f.fecha_cump_docs||''}" style="${iS}">
              <label style="${lS}">ReteIca</label><input type="number" step="0.01" name="reteica" value="${f.reteica}" style="${iS}">
            </div>
            <div>
              <label style="${lS}">Legalización</label><input type="date" name="fecha_legalizacion" value="${f.fecha_legalizacion||''}" style="${iS}">
              <label style="${lS}">SALDO FINAL</label><input type="number" step="0.01" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="${iS} border-color:#10b981; color:#10b981; font-weight:bold;">
            </div>
          </div>

          <button type="submit" style="width:100%; padding:20px; background:#3b82f6; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:18px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);">GUARDAR LIQUIDACIÓN COMPLETA</button>
        </form>
        <p style="text-align:center; margin-top:20px;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Cancelar y volver al listado</a></p>
      </div>
    </body>`);
});

// --- RUTA DE GUARDADO ---
app.post('/guardar/:id', async (req, res) => {
  try {
    const d = req.body;
    // Limpieza de emojis y normalización antes de guardar
    Object.keys(d).forEach(k => { if(typeof d[k] === 'string') d[k] = d[k].replace(/[✅❌]/g, '').toUpperCase().trim(); });
    await Finanza.update(d, { where: { cargaId: req.params.id } });
    res.redirect('/');
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT));
