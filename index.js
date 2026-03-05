const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CONFIGURACIÓN DE BASE DE DATOS
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// MODELO DE FINANZAS CON TODOS LOS CAMPOS SOLICITADOS
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  
  // Anticipos
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },

  // Cumplidos y Documentación
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
  entrega_manifiesto: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_remesa: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_hoja_tiempos: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_docs_cliente: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_facturas: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_tirilla_vacio: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_tiquete_cargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_tiquete_descargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },

  // Novedades
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  // Liquidación Final
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago_final: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

// FUNCIÓN DE AYUDA: TARIFA RETEICA SEGÚN CIUDAD
function getTarifaICA(ciudad) {
  const c = (ciudad || '').toUpperCase();
  if (c.includes('BOGOTA')) return 0.00966;
  if (c.includes('CARTAGENA')) return 0.007;
  if (c.includes('BUENAVENTURA')) return 0.008;
  return 0.005; // Por defecto 5x1000
}

// RUTA PRINCIPAL: TABLERO DE CONTROL
app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let granTotalSaldo = 0;

    const filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      
      const flete = f ? Number(f.v_flete) : 0;
      // DEDUCCIONES = Anticipos + Sobreanticipos + Descuentos + Retenciones
      const deducciones = f ? (
        Number(f.valor_anticipo) + Number(f.sobre_anticipo) + 
        Number(f.valor_descuento) + Number(f.retefuente) + Number(f.reteica)
      ) : 0;
      const saldo = flete - deducciones;
      const estado = f ? f.est_pago_final : 'PENDIENTE';

      if(estado === 'PENDIENTE') granTotalSaldo += saldo;

      // Cálculo de días sin cumplir/pagar
      const dias = c.f_doc ? Math.floor((new Date() - new Date(c.f_doc)) / 86400000) : 0;

      const td = `padding: 8px; text-align: center; border-right: 1px solid #334155;`;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 11px; background: ${estado === 'PAGADO' ? 'rgba(16,185,129,0.05)' : 'transparent'};">
          <td style="${td}">${c.id}</td>
          <td style="${td}">${c.f_doc || '---'}</td>
          <td style="${td}">${c.cli || '---'}</td>
          <td style="${td}"><b>${c.placa}</b></td>
          <td style="${td} color: #10b981;">$${flete.toLocaleString('es-CO')}</td>
          <td style="${td} color: #ef4444;">$${deducciones.toLocaleString('es-CO')}</td>
          <td style="${td} font-weight: bold; background: rgba(255,255,255,0.03);">$${saldo.toLocaleString('es-CO')}</td>
          <td style="${td} color: #fbbf24;">${dias} d</td>
          <td style="${td} font-weight: bold;">${c.est_real || '---'}</td>
          <td style="${td}">
            <span style="background:${estado==='PAGADO'?'#065f46':'#7f1d1d'}; padding:3px 6px; border-radius:4px;">${estado}</span>
          </td>
          <td style="padding: 8px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[GESTIONAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:20px; border-radius:10px; border:1px solid #334155; margin-bottom:15px;">
          <div><h2 style="margin:0; color:#3b82f6;">YEGO ERP CONTABLE</h2><small>Flete - Deducciones = Saldo Neto</small></div>
          <div style="text-align:right;"><small style="color:#ef4444;">SALDO TOTAL PENDIENTE:</small><br><b style="font-size:24px;">$ ${granTotalSaldo.toLocaleString('es-CO')}</b></div>
        </div>
        <div style="overflow-x:auto; border-radius:10px; border:1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; min-width:1200px;">
            <thead style="background:#1e40af; font-size:10px; text-transform:uppercase;">
              <tr>
                <th style="padding:12px; border-right:1px solid #475569;">ID</th>
                <th style="border-right:1px solid #475569;">FECHA</th>
                <th style="border-right:1px solid #475569;">CLIENTE</th>
                <th style="border-right:1px solid #475569;">PLACA</th>
                <th style="border-right:1px solid #475569; background:#064e3b;">FLETE</th>
                <th style="border-right:1px solid #475569; background:#7f1d1d;">DEDUCCIONES</th>
                <th style="border-right:1px solid #475569; background:#334155;">SALDO NETO</th>
                <th style="border-right:1px solid #475569;">DÍAS</th>
                <th style="border-right:1px solid #475569;">LOGÍSTICA</th>
                <th style="border-right:1px solid #475569;">PAGO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// FORMULARIO DE GESTIÓN MANUAL (FICHA TÉCNICA)
app.get('/editar/:id', async (req, res) => {
  const carga = await db.query(`SELECT orig, v_flete FROM "Cargas" WHERE id = ${req.params.id}`, { type: QueryTypes.SELECT });
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  
  const origen = carga[0]?.orig || 'DESCONOCIDO';
  const fleteBase = Number(f.v_flete) || 0;
  const tarifaICA = getTarifaICA(origen);

  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:850px; margin:auto; background:#1e293b; padding:25px; border-radius:12px; border:1px solid #3b82f6;">
        <h2 style="text-align:center; color:#3b82f6;">Liquidación Carga #${req.params.id}</h2>
        <p style="text-align:center; color:#94a3b8;">Origen Detectado: ${origen} (ICA: ${(tarifaICA*1000).toFixed(2)}x1000)</p>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px;">
          <fieldset style="grid-column: span 3; border: 1px solid #334155; padding: 15px; border-radius: 8px;">
            <legend style="color:#fbbf24;">VALORES BASE</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <label>Flete Conductor: <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; background:#0f172a; color:#10b981; border:1px solid #475569; padding:8px;"></label>
              <label>Valor a Facturar: <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; background:#0f172a; color:#3b82f6; border:1px solid #475569; padding:8px;"></label>
            </div>
          </fieldset>

          <fieldset style="grid-column: span 3; border: 1px solid #334155; padding: 15px; border-radius: 8px;">
            <legend style="color:#fbbf24;">ANTICIPOS</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
              <label>Tipo Anticipo: <input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569; padding:8px;"></label>
              <label>Valor Anticipo: <input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; background:#0f172a; color:#ef4444; border:1px solid #475569; padding:8px;"></label>
              <label>Sobre Anticipo: <input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; background:#0f172a; color:#ef4444; border:1px solid #475569; padding:8px;"></label>
              <label>Estado Anticipo: <select name="estado_anticipo" style="width:100%; background:#0f172a; color:white; padding:8px;"><option ${f.estado_anticipo==='PENDIENTE'?'selected':''}>PENDIENTE</option><option ${f.estado_anticipo==='PAGADO'?'selected':''}>PAGADO</option></select></label>
              <label>Fecha Pago Ant.: <input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569; padding:8px;"></label>
            </div>
          </fieldset>

          <fieldset style="grid-column: span 3; border: 1px solid #334155; padding: 15px; border-radius: 8px;">
            <legend style="color:#3b82f6;">CUMPLIDOS (CHECKLIST)</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; font-size:11px;">
              <label><input type="checkbox" name="entrega_manifiesto" ${f.entrega_manifiesto?'checked':''}> Manifiesto</label>
              <label><input type="checkbox" name="entrega_remesa" ${f.entrega_remesa?'checked':''}> Remesa</label>
              <label><input type="checkbox" name="entrega_hoja_tiempos" ${f.entrega_hoja_tiempos?'checked':''}> Hoja Tiempos</label>
              <label><input type="checkbox" name="entrega_docs_cliente" ${f.entrega_docs_cliente?'checked':''}> Docs Cliente</label>
              <label><input type="checkbox" name="entrega_facturas" ${f.entrega_facturas?'checked':''}> Facturas</label>
              <label><input type="checkbox" name="entrega_tirilla_vacio" ${f.entrega_tirilla_vacio?'checked':''}> Tirilla Vacío</label>
              <label><input type="checkbox" name="entrega_tiquete_cargue" ${f.entrega_tiquete_cargue?'checked':''}> Tiquete Cargue</label>
              <label><input type="checkbox" name="entrega_tiquete_descargue" ${f.entrega_tiquete_descargue?'checked':''}> Tiquete Descargue</label>
            </div>
          </fieldset>

          <fieldset style="grid-column: span 3; border: 1px solid #ef4444; padding: 15px; border-radius: 8px;">
            <legend style="color:#ef4444;">DEDUCCIONES LEGALES Y NOVEDADES</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
              <label>Retefuente (1%): <input type="number" name="retefuente" value="${f.retefuente > 0 ? f.retefuente : (fleteBase * 0.01).toFixed(0)}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569; padding:8px;"></label>
              <label>Reteica (Sugerido): <input type="number" name="reteica" value="${f.reteica > 0 ? f.reteica : (fleteBase * tarifaICA).toFixed(0)}" style="width:100%; background:#0f172a; color:#fbbf24; border:1px solid #fbbf24; padding:8px;"></label>
              <label>Valor Descuento: <input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; background:#0f172a; color:#ef4444; border:1px solid #475569; padding:8px;"></label>
              <label style="grid-column: span 3;">Obs. Novedad: <input type="text" name="obs_novedad" value="${f.obs_novedad || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569; padding:8px;"></label>
            </div>
          </fieldset>

          <label style="grid-column: span 3;">ESTADO PAGO FINAL: 
            <select name="est_pago_final" style="width:100%; background:#10b981; color:white; padding:12px; font-weight:bold; border:none; border-radius:5px;">
              <option ${f.est_pago_final==='PENDIENTE'?'selected':''}>PENDIENTE</option>
              <option ${f.est_pago_final==='PAGADO'?'selected':''}>PAGADO</option>
            </select>
          </label>
        </div>

        <button type="submit" style="width:100%; padding:15px; margin-top:20px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">GUARDAR CAMBIOS CONTABLES</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  const data = req.body;
  const checks = ['entrega_manifiesto', 'entrega_remesa', 'entrega_hoja_tiempos', 'entrega_docs_cliente', 'entrega_facturas', 'entrega_tirilla_vacio', 'entrega_tiquete_cargue', 'entrega_tiquete_descargue'];
  checks.forEach(c => data[c] = data[c] === 'on');
  await Finanza.update(data, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 ERP YEGO FINALIZADO')));
