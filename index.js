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

// MODELO FINANZAS - SIN ALTERAR ESTRUCTURA
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
}, { tableName: 'Yego_Finanzas', timestamps: false });

// FUNCIÓN DE EXTRACCIÓN INFALIBLE
const getV = (obj, key) => {
  if (!obj) return null;
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return foundKey ? obj[foundKey] : null;
};

const statusCheck = (val) => {
  const v = String(val || '').trim().toUpperCase();
  if (v === 'SI') return '<span style="color: #10b981;">✅ SI</span>';
  if (v === 'NO') return '<span style="color: #ef4444;">❌ NO</span>';
  return val || '---';
};

app.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT c.*, f.*, c.id AS main_id 
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON CAST(c.id AS TEXT) = CAST(f."cargaId" AS TEXT)
      WHERE c.placa IS NOT NULL AND c.placa != '' 
      ORDER BY c.id DESC LIMIT 150`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    let totalPendiente = 0;
    let filas = datos.map(c => {
      // Extraemos valores usando la función que ignora mayúsculas/minúsculas
      const fleteP = parseFloat(getV(c, 'v_flete') || 0);
      const fleteF = parseFloat(getV(c, 'v_facturar') || 0);
      const f_reg = getV(c, 'f_doc') || getV(c, 'fecha') || '---';
      const est_p = getV(c, 'est_pago') || 'PENDIENTE';
      
      if(est_p === 'PENDIENTE') totalPendiente += fleteP;

      const tdStyle = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

      return `
        <tr class="fila-carga" data-placa="${(getV(c, 'placa') || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle} color: #94a3b8;">#${getV(c, 'main_id')}</td>
          <td style="${tdStyle}">${f_reg}</td>
          <td style="${tdStyle}">${getV(c, 'oficina') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'orig') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'dest') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'cli') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'cont') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'ped') || '---'}</td>
          <td style="${tdStyle} background: rgba(59, 130, 246, 0.1); font-weight: bold;">${getV(c, 'placa')}</td>
          <td style="${tdStyle}">${getV(c, 'muc') || '---'}</td>
          <td style="${tdStyle} color: #10b981; font-weight: bold;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${getV(c, 'f_act') || '---'}</td>
          <td style="${tdStyle} color: #fbbf24;">${getV(c, 'est_real') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'tipo_anticipo') || '---'}</td>
          <td style="${tdStyle}">$${parseFloat(getV(c, 'valor_anticipo') || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">$${parseFloat(getV(c, 'sobre_anticipo') || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${getV(c, 'estado_ant') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'fecha_pago_ant') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'tipo_cumplido') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'fecha_cump_virtual') || '---'}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_manifiesto'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_remesa'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_hoja_tiempos'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_docs_cliente'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_facturas'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_tirilla_vacio'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_tiq_cargue'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'ent_tiq_descargue'))}</td>
          <td style="${tdStyle}">${statusCheck(getV(c, 'presenta_novedades'))}</td>
          <td style="${tdStyle}">${getV(c, 'obs_novedad') || '---'}</td>
          <td style="${tdStyle} color: #ef4444;">$${parseFloat(getV(c, 'valor_descuento') || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${getV(c, 'fecha_cump_docs') || '---'}</td>
          <td style="${tdStyle}">${getV(c, 'fecha_legalizacion') || '---'}</td>
          <td style="${tdStyle}">$${parseFloat(getV(c, 'retefuente') || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">$${parseFloat(getV(c, 'reteica') || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${parseFloat(getV(c, 'saldo_a_pagar') || 0).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">${getV(c, 'estado_final') || '---'}</td>
          <td style="${tdStyle} color: #ef4444;">${getV(c, 'dias_sin_pagar') || 0}</td>
          <td style="${tdStyle} color: #3b82f6;">${getV(c, 'dias_sin_cumplir') || 0}</td>
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${getV(c, 'main_id')}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    const thStyle = `padding: 15px 10px; text-align: center; border-right: 1px solid #475569; border-bottom: 2px solid #3b82f6; white-space: nowrap;`;

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: 'Segoe UI', sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="margin:0; color: #3b82f6;">YEGO SISTEMA CONTABLE</h2>
          <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 5px 15px; border-radius: 6px; border: 1px solid #ef4444;">
            <small style="color:#ef4444; font-weight: bold;">TOTAL POR PAGAR:</small><br>
            <b style="color:#f1f5f9; font-size: 20px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>
        <input type="text" id="buscador" placeholder="🔍 Filtrar por placa..." style="width:100%; padding:12px; margin-bottom:15px; border-radius:6px; border:1px solid #334155; background:#1e293b; color:white; outline: none;">
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width: 6500px;">
            <thead style="background:#1e40af; color: white; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="${thStyle}">ID</th><th style="${thStyle}">FECHA REGISTRO</th><th style="${thStyle}">OFICINA</th>
                <th style="${thStyle}">ORIGEN</th><th style="${thStyle}">DESTINO</th><th style="${thStyle}">CLIENTE</th>
                <th style="${thStyle}">CONTENEDOR</th><th style="${thStyle}">PEDIDO</th><th style="${thStyle}">PLACA</th>
                <th style="${thStyle}">MUC</th><th style="${thStyle}">FLETE A PAGAR</th>
                <th style="${thStyle}">FLETE A FACTURAR</th><th style="${thStyle}">FECHA ACTUALIZACIÓN</th>
                <th style="${thStyle}">ESTADO FINAL LOGIS</th>
                <th style="${thStyle}">TIPO DE ANTICIPO</th><th style="${thStyle}">VALOR ANTICIPO</th>
                <th style="${thStyle}">SOBRE ANTICIPO</th><th style="${thStyle}">ESTADO</th>
                <th style="${thStyle}">FECHA DE PAGO ANTICIPO</th><th style="${thStyle}">TIPO DE CUMPLIDO</th>
                <th style="${thStyle}">FECHA CUMPLIDO VIRTUAL</th><th style="${thStyle}">ENTREGA DE MANIFIESTO</th>
                <th style="${thStyle}">ENTREGA DE REMESA</th><th style="${thStyle}">ENTREGA DE HOJA DE TIEMPOS</th>
                <th style="${thStyle}">ENTREGA DE DOCUMENTOS CLIENTE</th><th style="${thStyle}">ENTREGA DE FACTURAS</th>
                <th style="${thStyle}">ENTREGA DE TIRILLA CONTENEDOR VACÍO</th><th style="${thStyle}">ENTREGA DE TIQUETE DE CARGUE (GRANEL)</th>
                <th style="${thStyle}">ENTREGA DE TIQUETE DE DESCARGUE (GRANEL)</th><th style="${thStyle}">¿EL SERVICIO PRESENTA NOVEDADES?</th>
                <th style="${thStyle}">OBSERVACION NOVEDAD</th><th style="${thStyle}">VALOR DESCUENTO</th>
                <th style="${thStyle}">FECHA DE CUMPLIDO DOCUMENTOS</th><th style="${thStyle}">FECHA DE LEGALIZACIÓN</th>
                <th style="${thStyle}">RETEFUENTE</th><th style="${thStyle}">RETEICA</th>
                <th style="${thStyle}">SALDO A PAGAR</th><th style="${thStyle}">ESTADO</th>
                <th style="${thStyle}">DÍAS SIN PAGAR</th><th style="${thStyle}">DÍAS SIN CUMPLIR</th>
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
      <div style="max-width:1000px; margin:auto; background:#1e293b; padding:30px; border-radius:12px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; text-align: center; margin-bottom:25px;">GESTIÓN INTEGRAL CARGA #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div><label>FLETE PAGAR</label><input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155;"></div>
          <div><label>FLETE FACTURAR</label><input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155;"></div>
          <div><label>VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></div>
          <div><label>SALDO FINAL A PAGAR</label><input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #10b981;"></div>
          <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:16px;">ACTUALIZAR DATOS</button>
        </form>
        <p style="text-align:center; margin-top:15px;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al listado</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.upsert({ cargaId: req.params.id, ...req.body });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 YEGO INTEGRADO ACTIVO')));
