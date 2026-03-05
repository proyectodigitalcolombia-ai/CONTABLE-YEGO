const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

// Middlewares para procesar datos (NODE_VERSION 20)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Conexión a Base de Datos
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// --- MODELO FINANCIERO COMPLETO (CAMPOS MANUALES) ---
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

// Función para transformar SI/NO en Iconos (Solo visual)
const renderStatus = (v) => {
  const val = (v || 'NO').toUpperCase().trim();
  if (val === 'SI') return '<b style="color:#10b981;">✅ SI</b>';
  if (val === 'NO') return '<b style="color:#ef4444;">❌ NO</b>';
  return val;
};

// --- RUTA PRINCIPAL: TABLERO DE CONTROL ---
app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalCuentasPorPagar = 0;

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fletePagar = Number(f.v_flete || 0);
      
      // Cálculo de total pendiente
      if((f.est_pago || "PENDIENTE") === 'PENDIENTE') totalCuentasPorPagar += fletePagar;

      const styleTd = `padding: 12px 8px; text-align: center; border-right: 1px solid #334155; white-space: nowrap; font-size: 11px;`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; transition: background 0.2s;">
          <td style="${styleTd} color: #94a3b8;">#${c.id}</td>
          <td style="${styleTd}">${c.f_doc || '---'}</td>
          <td style="${styleTd}">${c.oficina || '---'}</td>
          <td style="${styleTd}">${c.orig || '---'}</td>
          <td style="${styleTd}">${c.dest || '---'}</td>
          <td style="${styleTd}">${c.cli || '---'}</td>
          <td style="${styleTd}">${c.cont || '---'}</td>
          <td style="${styleTd}">${c.ped || '---'}</td>
          <td style="${styleTd} background: rgba(59, 130, 246, 0.1); font-weight: bold; color: #60a5fa;">${c.placa}</td>
          <td style="${styleTd}">${c.muc || '---'}</td>
          <td style="${styleTd} color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${styleTd} color: #3b82f6;">$${Number(f.v_facturar || 0).toLocaleString('es-CO')}</td>
          <td style="${styleTd}">${c.f_act || '---'}</td>
          <td style="${styleTd} color: #fbbf24;">${c.est_real || '---'}</td>
          <td style="${styleTd}">${f.tipo_anticipo || '---'}</td>
          <td style="${styleTd}">$${Number(f.valor_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${styleTd}">$${Number(f.sobre_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${styleTd}">${f.estado_ant || '---'}</td>
          <td style="${styleTd}">${f.fecha_pago_ant || '---'}</td>
          <td style="${styleTd}">${f.tipo_cumplido || '---'}</td>
          <td style="${styleTd}">${f.fecha_cump_virtual || '---'}</td>
          
          <td style="${styleTd}">${renderStatus(f.ent_manifiesto)}</td>
          <td style="${styleTd}">${renderStatus(f.ent_remesa)}</td>
          <td style="${styleTd}">${renderStatus(f.ent_hoja_tiempos)}</td>
          <td style="${styleTd}">${renderStatus(f.ent_docs_cliente)}</td>
          <td style="${styleTd}">${renderStatus(f.ent_facturas)}</td>
          <td style="${styleTd}">${renderStatus(f.ent_tirilla_vacio)}</td>
          <td style="${styleTd}">${renderStatus(f.ent_tiq_cargue)}</td>
          <td style="${styleTd}">${renderStatus(f.ent_tiq_descargue)}</td>
          <td style="${styleTd}">${renderStatus(f.presenta_novedades)}</td>
          
          <td style="${styleTd} max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${f.obs_novedad || '---'}</td>
          <td style="${styleTd} color: #ef4444;">$${Number(f.valor_descuento || 0).toLocaleString('es-CO')}</td>
          <td style="${styleTd}">${f.fecha_cump_docs || '---'}</td>
          <td style="${styleTd}">${f.fecha_legalizacion || '---'}</td>
          <td style="${styleTd}">$${Number(f.retefuente || 0).toLocaleString('es-CO')}</td>
          <td style="${styleTd}">$${Number(f.reteica || 0).toLocaleString('es-CO')}</td>
          <td style="${styleTd} background: rgba(16, 185, 129, 0.1); color: #10b981; font-weight: bold;">$${Number(f.saldo_a_pagar || 0).toLocaleString('es-CO')}</td>
          <td style="${styleTd}">${f.estado_final || '---'}</td>
          <td style="${styleTd}">${f.dias_sin_pagar || 0}</td>
          <td style="${styleTd}">${f.dias_sin_cumplir || 0}</td>
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.id}" style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 10px;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    const styleTh = `padding: 15px 10px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6; white-space: nowrap;`;

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:20px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
          <div>
            <h1 style="margin:0; color: #3b82f6; letter-spacing: 1px;">YEGO FINANZAS <span style="color:#94a3b8; font-weight:normal; font-size:16px;">| Panel Contable</span></h1>
          </div>
          <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 10px 25px; border-radius: 8px; border: 1px solid #ef4444;">
            <small style="color:#ef4444; font-weight: bold; text-transform: uppercase;">Total Cuentas por Pagar</small><br>
            <b style="font-size: 24px;">$ ${totalCuentasPorPagar.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Filtrar por Placa del Vehículo..." style="width:100%; padding:15px; margin-bottom:20px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:white; font-size: 16px; outline: none;">

        <div style="overflow-x: auto; border-radius: 12px; border: 1px solid #334155; background: #1e293b;">
          <table style="width:100%; border-collapse:collapse; min-width: 6500px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="${styleTh}">ID</th><th style="${styleTh}">REGISTRO</th><th style="${styleTh}">OFICINA</th>
                <th style="${styleTh}">ORIGEN</th><th style="${styleTh}">DESTINO</th><th style="${styleTh}">CLIENTE</th>
                <th style="${styleTh}">CONTENEDOR</th><th style="${styleTh}">PEDIDO</th><th style="${styleTh}">PLACA</th>
                <th style="${styleTh}">MUC</th><th style="${styleTh}">V. FLETE</th>
                <th style="${styleTh}">V. FACTURAR</th><th style="${styleTh}">ACTUALIZACIÓN</th>
                <th style="${styleTh}">ESTADO LOGÍSTICO</th>
                <th style="${styleTh}">TIPO ANTICIPO</th><th style="${styleTh}">VALOR ANTICIPO</th>
                <th style="${styleTh}">SOBRE ANTICIPO</th><th style="${styleTh}">ESTADO ANT.</th>
                <th style="${styleTh}">FECHA PAGO ANT.</th><th style="${styleTh}">TIPO CUMPLIDO</th>
                <th style="${styleTh}">FECHA VIRTUAL</th><th style="${styleTh}">MANIFIESTO</th>
                <th style="${styleTh}">REMESA</th><th style="${styleTh}">HOJA TIEMPOS</th>
                <th style="${styleTh}">DOCS CLIENTE</th><th style="${styleTh}">FACTURAS</th>
                <th style="${styleTh}">TIRILLA VACÍO</th><th style="${styleTh}">TIQ. CARGUE</th>
                <th style="${styleTh}">TIQ. DESCARGUE</th><th style="${styleTh}">NOVEDADES</th>
                <th style="${styleTh}">OBSERVACIÓN</th><th style="${styleTh}">VALOR DESC.</th>
                <th style="${styleTh}">FECHA CUMP. DOCS</th><th style="${styleTh}">LEGALIZACIÓN</th>
                <th style="${styleTh}">RETEFUENTE</th><th style="${styleTh}">RETEICA</th>
                <th style="${styleTh}">SALDO A PAGAR</th><th style="${styleTh}">ESTADO PAGO</th>
                <th style="${styleTh}">DÍAS MORA PAGO</th><th style="${styleTh}">DÍAS MORA CUMP</th>
                <th style="${styleTh}">ACCIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>

        <script>
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(f => {
              f.style.display = f.getAttribute('data-placa').includes(term) ? '' : 'none';
            });
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error del sistema: " + err.message); }
});

// --- RUTA DE EDICIÓN: FORMULARIO TÉCNICO ---
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  
  const labelS = `display: block; margin-bottom: 5px; color: #94a3b8; font-size: 12px; font-weight: bold;`;
  const inputS = `width: 100%; padding: 10px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 6px; margin-bottom: 15px; outline: none;`;

  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding: 40px;">
      <div style="max-width: 1100px; margin: auto; background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid #3b82f6; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <h2 style="text-align: center; color: #3b82f6; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px;">Gestión de Carga #${req.params.id}</h2>
        
        <form action="/guardar/${req.params.id}" method="POST">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; border-bottom: 1px solid #334155; margin-bottom: 20px;">
            <div><label style="${labelS}">V. FLETE PAGAR</label><input type="number" step="0.01" name="v_flete" value="${f.v_flete}" style="${inputS} border-color: #10b981;"></div>
            <div><label style="${labelS}">V. FLETE FACTURAR</label><input type="number" step="0.01" name="v_facturar" value="${f.v_facturar}" style="${inputS} border-color: #3b82f6;"></div>
            <div><label style="${labelS}">ESTADO PAGO</label><input type="text" name="est_pago" value="${f.est_pago}" style="${inputS}"></div>
            <div><label style="${labelS}">TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="${inputS}"></div>
            
            <div><label style="${labelS}">VALOR ANTICIPO</label><input type="number" step="0.01" name="valor_anticipo" value="${f.valor_anticipo}" style="${inputS}"></div>
            <div><label style="${labelS}">SOBRE ANTICIPO</label><input type="number" step="0.01" name="sobre_anticipo" value="${f.sobre_anticipo}" style="${inputS}"></div>
            <div><label style="${labelS}">ESTADO ANT.</label><input type="text" name="estado_ant" value="${f.estado_ant || ''}" style="${inputS}"></div>
            <div><label style="${labelS}">FECHA PAGO ANT.</label><input type="date" name="fecha_pago_ant" value="${f.fecha_pago_ant || ''}" style="${inputS}"></div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.5); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
            <h4 style="margin: 0 0 15px; color: #3b82f6; font-size: 14px; text-transform: uppercase;">Control de Entrega de Documentos (SI / NO)</h4>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px;">
              <div><label style="${labelS}">MANIFIESTO</label><input type="text" name="ent_manifiesto" value="${f.ent_manifiesto}" style="${inputS}"></div>
              <div><label style="${labelS}">REMESA</label><input type="text" name="ent_remesa" value="${f.ent_remesa}" style="${inputS}"></div>
              <div><label style="${labelS}">HOJA TIEMPOS</label><input type="text" name="ent_hoja_tiempos" value="${f.ent_hoja_tiempos}" style="${inputS}"></div>
              <div><label style="${labelS}">DOCS CLIENTE</label><input type="text" name="ent_docs_cliente" value="${f.ent_docs_cliente}" style="${inputS}"></div>
              <div><label style="${labelS}">FACTURAS</label><input type="text" name="ent_facturas" value="${f.ent_facturas}" style="${inputS}"></div>
              <div><label style="${labelS}">TIRILLA VACÍO</label><input type="text" name="ent_tirilla_vacio" value="${f.ent_tirilla_vacio}" style="${inputS}"></div>
              <div><label style="${labelS}">TIQ. CARGUE</label><input type="text" name="ent_tiq_cargue" value="${f.ent_tiq_cargue}" style="${inputS}"></div>
              <div><label style="${labelS}">TIQ. DESCARGUE</label><input type="text" name="ent_tiq_descargue" value="${f.ent_tiq_descargue}" style="${inputS}"></div>
              <div><label style="${labelS}">PRESENTA NOVED.</label><input type="text" name="presenta_novedades" value="${f.presenta_novedades}" style="${inputS}"></div>
              <div><label style="${labelS}">TIPO CUMPLIDO</label><input type="text" name="tipo_cumplido" value="${f.tipo_cumplido || ''}" style="${inputS}"></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 20px;">
            <div><label style="${labelS}">OBSERVACIÓN NOVEDAD</label><textarea name="obs_novedad" style="${inputS} height: 80px;">${f.obs_novedad || ''}</textarea></div>
            <div>
               <label style="${labelS}">VALOR DESCUENTO</label><input type="number" step="0.01" name="valor_descuento" value="${f.valor_descuento}" style="${inputS} border-color: #ef4444;">
               <label style="${labelS}">RETEFUENTE</label><input type="number" step="0.01" name="retefuente" value="${f.retefuente}" style="${inputS}">
            </div>
            <div>
               <label style="${labelS}">FECHA CUMP. DOCS</label><input type="date" name="fecha_cump_docs" value="${f.fecha_cump_docs || ''}" style="${inputS}">
               <label style="${labelS}">RETEICA</label><input type="number" step="0.01" name="reteica" value="${f.reteica}" style="${inputS}">
            </div>
            <div>
               <label style="${labelS}">FECHA LEGALIZACIÓN</label><input type="date" name="fecha_legalizacion" value="${f.fecha_legalizacion || ''}" style="${inputS}">
               <label style="${labelS}">SALDO A PAGAR</label><input type="number" step="0.01" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="${inputS} border-color: #10b981; font-weight: bold; color: #10b981;">
            </div>
          </div>

          <button type="submit" style="width: 100%; padding: 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 18px; cursor: pointer; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">ACTUALIZAR REGISTRO CONTABLE</button>
        </form>
        
        <p style="text-align: center; margin-top: 20px;"><a href="/" style="color: #94a3b8; text-decoration: none;">← Volver al Tablero Principal</a></p>
      </div>
    </body>`);
});

// --- RUTA DE GUARDADO ---
app.post('/guardar/:id', async (req, res) => {
  try {
    const data = req.body;
    // Limpieza de datos: Aseguramos que los campos de SI/NO se guarden limpios y en mayúsculas
    const camposTexto = ['ent_manifiesto', 'ent_remesa', 'ent_hoja_tiempos', 'ent_docs_cliente', 'ent_facturas', 'ent_tirilla_vacio', 'ent_tiq_cargue', 'ent_tiq_descargue', 'presenta_novedades'];
    
    camposTexto.forEach(key => {
      if (data[key]) data[key] = data[key].replace(/[✅❌]/g, '').toUpperCase().trim();
    });

    await Finanza.update(data, { where: { cargaId: req.params.id } });
    res.redirect('/');
  } catch (e) { res.status(500).send("Error al guardar: " + e.message); }
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log('🚀 SISTEMA YEGO FINANZAS OPERATIVO EN PUERTO ' + PORT));
});
