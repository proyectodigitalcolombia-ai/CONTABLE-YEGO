const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

// Configuración de Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Conexión a Base de Datos (Usando NODE_VERSION 20 como solicitaste)
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// --- MODELO DE DATOS COMPLETO ---
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

// --- VISTA PRINCIPAL (TABLA) ---
app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let totalPendiente = 0;
    
    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      const fletePagar = Number(f.v_flete || 0);
      if((f.est_pago || "PENDIENTE") === 'PENDIENTE') totalPendiente += fletePagar;

      const tdS = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;
      
      // Función interna para renderizar iconos en la tabla
      const icon = (val) => {
        const v = (val || 'NO').toUpperCase();
        return v === 'SI' ? '<b style="color:#10b981;">✅ SI</b>' : '<b style="color:#ef4444;">❌ NO</b>';
      };

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdS} color: #94a3b8;">#${c.id}</td>
          <td style="${tdS}">${c.f_doc || '---'}</td>
          <td style="${tdS}">${c.oficina || '---'}</td>
          <td style="${tdS}">${c.orig || '---'}</td>
          <td style="${tdS}">${c.dest || '---'}</td>
          <td style="${tdS}">${c.cli || '---'}</td>
          <td style="${tdS}">${c.cont || '---'}</td>
          <td style="${tdS}">${c.ped || '---'}</td>
          <td style="${tdS} background: rgba(59, 130, 246, 0.1); font-weight: bold;">${c.placa}</td>
          <td style="${tdS}">${c.muc || '---'}</td>
          <td style="${tdS} color: #10b981; font-weight: bold;">$${fletePagar.toLocaleString('es-CO')}</td>
          <td style="${tdS} color: #3b82f6;">$${Number(f.v_facturar || 0).toLocaleString('es-CO')}</td>
          <td style="${tdS}">${c.f_act || '---'}</td>
          <td style="${tdS} color: #fbbf24;">${c.est_real || '---'}</td>
          <td style="${tdS}">${f.tipo_anticipo || '---'}</td>
          <td style="${tdS}">$${Number(f.valor_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdS}">$${Number(f.sobre_anticipo || 0).toLocaleString('es-CO')}</td>
          <td style="${tdS}">${f.estado_ant || '---'}</td>
          <td style="${tdS}">${f.fecha_pago_ant || '---'}</td>
          <td style="${tdS}">${f.tipo_cumplido || '---'}</td>
          <td style="${tdS}">${f.fecha_cump_virtual || '---'}</td>
          
          <td style="${tdS}">${icon(f.ent_manifiesto)}</td>
          <td style="${tdS}">${icon(f.ent_remesa)}</td>
          <td style="${tdS}">${icon(f.ent_hoja_tiempos)}</td>
          <td style="${tdS}">${icon(f.ent_docs_cliente)}</td>
          <td style="${tdS}">${icon(f.ent_facturas)}</td>
          <td style="${tdS}">${icon(f.ent_tirilla_vacio)}</td>
          <td style="${tdS}">${icon(f.ent_tiq_cargue)}</td>
          <td style="${tdS}">${icon(f.ent_tiq_descargue)}</td>
          <td style="${tdS}">${icon(f.presenta_novedades)}</td>
          
          <td style="${tdS}">${f.obs_novedad || '---'}</td>
          <td style="${tdS} color: #ef4444;">$${Number(f.valor_descuento || 0).toLocaleString('es-CO')}</td>
          <td style="${tdS}">${f.fecha_cump_docs || '---'}</td>
          <td style="${tdS}">${f.fecha_legalizacion || '---'}</td>
          <td style="${tdS}">$${Number(f.retefuente || 0).toLocaleString('es-CO')}</td>
          <td style="${tdS}">$${Number(f.reteica || 0).toLocaleString('es-CO')}</td>
          <td style="${tdS} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${Number(f.saldo_a_pagar || 0).toLocaleString('es-CO')}</td>
          <td style="${tdS}">${f.estado_final || '---'}</td>
          <td style="${tdS} color: #ef4444;">${f.dias_sin_pagar || 0}</td>
          <td style="${tdS} color: #3b82f6;">${f.dias_sin_cumplir || 0}</td>
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.id}" style="background: #3b82f6; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none; font-size: 10px;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    const thS = `padding: 15px 10px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6; white-space: nowrap;`;

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:20px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div>
            <h1 style="margin:0; color: #3b82f6; font-size: 24px;">YEGO <span style="color:#f1f5f9">FINANZAS</span></h1>
            <p style="margin:5px 0 0; color:#94a3b8; font-size: 12px;">Panel de Control y Liquidación de Cargas</p>
          </div>
          <div style="text-align: right; background: rgba(16, 185, 129, 0.1); padding: 10px 20px; border-radius: 8px; border: 1px solid #10b981;">
            <small style="color:#10b981; font-weight: bold; text-transform: uppercase;">Pendiente de Pago:</small><br>
            <b style="color:#f1f5f9; font-size: 24px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>

        <input type="text" id="buscador" placeholder="🔍 Buscar por placa de vehículo..." style="width:100%; padding:15px; margin-bottom:20px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:white; font-size:16px; outline: none; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);">

        <div style="overflow-x: auto; border-radius: 12px; border: 1px solid #334155; background: #1e293b;">
          <table style="width:100%; border-collapse:collapse; min-width: 6000px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
              <tr>
                <th style="${thS}">ID</th><th style="${thS}">REGISTRO</th><th style="${thS}">OFICINA</th>
                <th style="${thS}">ORIGEN</th><th style="${thS}">DESTINO</th><th style="${thS}">CLIENTE</th>
                <th style="${thS}">CONTENEDOR</th><th style="${thS}">PEDIDO</th><th style="${thS}">PLACA</th>
                <th style="${thS}">MUC</th><th style="${thS}">VALOR FLETE</th>
                <th style="${thS}">VALOR FACTURAR</th><th style="${thS}">ACTUALIZACIÓN</th>
                <th style="${thS}">ESTADO LOGÍSTICO</th>
                <th style="${thS}">TIPO ANTICIPO</th><th style="${thS}">VALOR ANTICIPO</th>
                <th style="${thS}">SOBRE ANTICIPO</th><th style="${thS}">ESTADO ANT.</th>
                <th style="${thS}">FECHA PAGO ANT.</th><th style="${thS}">TIPO CUMPLIDO</th>
                <th style="${thS}">FECHA VIRTUAL</th><th style="${thS}">MANIFIESTO</th>
                <th style="${thS}">REMESA</th><th style="${thS}">HOJA TIEMPOS</th>
                <th style="${thS}">DOCS CLIENTE</th><th style="${thS}">FACTURAS</th>
                <th style="${thS}">TIRILLA VACÍO</th><th style="${thS}">TIQ. CARGUE</th>
                <th style="${thS}">TIQ. DESCARGUE</th><th style="${thS}">NOVEDADES</th>
                <th style="${thS}">OBSERVACIÓN</th><th style="${thS}">DESCUENTO</th>
                <th style="${thS}">FECHA DOCS</th><th style="${thS}">LEGALIZACIÓN</th>
                <th style="${thS}">RETEFUENTE</th><th style="${thS}">RETEICA</th>
                <th style="${thS}">SALDO FINAL</th><th style="${thS}">ESTADO PAGO</th>
                <th style="${thS}">DÍAS MORA PAGO</th><th style="${thS}">DÍAS MORA CUMP</th>
                <th style="${thS}">ACCIONES</th>
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
  } catch (err) { res.status(500).send("Error crítico: " + err.message); }
});

// --- VISTA DE EDICIÓN (FORMULARIO) ---
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  
  const labelS = `display:block; margin-bottom:5px; color:#94a3b8; font-size:12px; font-weight:bold;`;
  const inputS = `width:100%; padding:10px; background:#0f172a; color:white; border:1px solid #334155; border-radius:4px; outline:none; margin-bottom:15px;`;

  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding: 40px;">
      <div style="max-width:1100px; margin:auto; background:#1e293b; padding:40px; border-radius:16px; border:1px solid #3b82f6; shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
        <h2 style="color:#3b82f6; text-align: center; margin-bottom:30px; text-transform:uppercase;">Gestión de Liquidación - Carga #${req.params.id}</h2>
        
        <form action="/guardar/${req.params.id}" method="POST">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
            <div><label style="${labelS}">VALOR FLETE</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="${inputS}"></div>
            <div><label style="${labelS}">VALOR FACTURAR</label><input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="${inputS}"></div>
            <div><label style="${labelS}">ESTADO PAGO</label><input type="text" name="est_pago" value="${f.est_pago}" style="${inputS}"></div>
            <div><label style="${labelS}">TIPO ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo||''}" style="${inputS}"></div>
            
            <div><label style="${labelS}">VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="${inputS}"></div>
            <div><label style="${labelS}">SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="${inputS}"></div>
            <div><label style="${labelS}">ESTADO ANTICIPO</label><input type="text" name="estado_ant" value="${f.estado_ant||''}" style="${inputS}"></div>
            <div><label style="${labelS}">FECHA PAGO ANT</label><input type="date" name="fecha_pago_ant" value="${f.fecha_pago_ant||''}" style="${inputS}"></div>
          </div>

          <div style="margin:20px 0; padding:25px; background:rgba(59, 130, 246, 0.05); border:1px solid #334155; border-radius:12px;">
            <h4 style="margin-top:0; color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:10px;">CONTROL DE DOCUMENTACIÓN (SI/NO)</h4>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px;">
              <div><label style="${labelS}">MANIFIESTO</label><input type="text" name="ent_manifiesto" value="${f.ent_manifiesto}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">REMESA</label><input type="text" name="ent_remesa" value="${f.ent_remesa}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">HOJA TIEMPOS</label><input type="text" name="ent_hoja_tiempos" value="${f.ent_hoja_tiempos}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">DOC CLIENTE</label><input type="text" name="ent_docs_cliente" value="${f.ent_docs_cliente}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">FACTURAS</label><input type="text" name="ent_facturas" value="${f.ent_facturas}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">TIRILLA VACÍO</label><input type="text" name="ent_tirilla_vacio" value="${f.ent_tirilla_vacio}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">TIQ. CARGUE</label><input type="text" name="ent_tiq_cargue" value="${f.ent_tiq_cargue}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">TIQ. DESCARGUE</label><input type="text" name="ent_tiq_descargue" value="${f.ent_tiq_descargue}" placeholder="SI o NO" style="${inputS}"></div>
              <div><label style="${labelS}">NOVEDADES</label><input type="text" name="presenta_novedades" value="${f.presenta_novedades}" placeholder="SI o NO" style="${inputS}"></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div style="grid-column: span 2;"><label style="${labelS}">OBSERVACIONES</label><textarea name="obs_novedad" style="${inputS} height:80px;">${f.obs_novedad||''}</textarea></div>
            <div><label style="${labelS}">VALOR DESCUENTO</label><input type="number" name="valor_descuento" value="${f.valor_descuento}" style="${inputS} border-color:#ef4444; color:#ef4444;"></div>
            
            <div><label style="${labelS}">RETEFUENTE</label><input type="number" name="retefuente" value="${f.retefuente}" style="${inputS}"></div>
            <div><label style="${labelS}">RETEICA</label><input type="number" name="reteica" value="${f.reteica}" style="${inputS}"></div>
            <div><label style="${labelS}">SALDO A PAGAR</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" style="${inputS} border-color:#10b981; color:#10b981; font-weight:bold;"></div>
          </div>

          <button type="submit" style="width:100%; padding:18px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:18px; margin-top:20px; transition: background 0.3s;">GUARDAR Y ACTUALIZAR LIQUIDACIÓN</button>
        </form>
        <p style="text-align:center; margin-top:20px;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Cancelar y volver al listado</a></p>
      </div>
    </body>`);
});

// --- GUARDADO DE DATOS ---
app.post('/guardar/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    // Normalizamos a mayúsculas los campos de SI/NO para evitar errores de visualización
    const camposSN = ['ent_manifiesto','ent_remesa','ent_hoja_tiempos','ent_docs_cliente','ent_facturas','ent_tirilla_vacio','ent_tiq_cargue','ent_tiq_descargue','presenta_novedades'];
    camposSN.forEach(campo => {
      if(data[campo]) data[campo] = data[campo].toUpperCase().trim();
    });

    await Finanza.update(data, { where: { cargaId: req.params.id } });
    res.redirect('/');
  } catch (e) { res.send("Error al guardar: " + e.message); }
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log('🚀 SISTEMA YEGO FINANZAS ACTIVO EN PUERTO ' + PORT));
});
