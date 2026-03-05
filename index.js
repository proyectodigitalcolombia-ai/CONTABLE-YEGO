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

// MODELO COMPLETO CON TODOS LOS CAMPOS SOLICITADOS
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  nro_factura: { type: DataTypes.STRING },
  
  // Anticipos
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },

  // Logística y Cumplidos
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },

  // Checklist Documentos (Booleanos)
  ent_manifiesto: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_remesa: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_hoja_tiempos: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_docs_cliente: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_facturas: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tirilla_vacio: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tiquete_cargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tiquete_descargue: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Novedades
  presenta_novedad: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  // Impuestos y Pago Final
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas' });

// Función auxiliar para calcular días transcurridos
const diffDias = (fecha) => {
  if (!fecha) return '---';
  const hoy = new Date();
  const f = new Date(fecha);
  const diff = Math.floor((hoy - f) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 100`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      
      // CÁLCULOS EN TIEMPO REAL
      const vFlete = Number(f.v_flete || 0);
      const deducciones = Number(f.valor_anticipo || 0) + Number(f.sobre_anticipo || 0) + Number(f.valor_descuento || 0) + Number(f.retefuente || 0) + Number(f.reteica || 0);
      const saldoAPagar = vFlete - deducciones;
      
      const diasSinPagar = f.est_pago !== 'PAGADO' ? diffDias(c.f_doc) : 0;
      const diasSinCumplir = !f.fecha_cumplido_docs ? diffDias(c.f_doc) : 0;

      return `
        <tr class="fila-carga" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="padding:10px;">#${c.id}</td>
          <td>${c.placa}</td>
          <td style="color:#10b981;">$${vFlete.toLocaleString()}</td>
          <td style="color:#ef4444;">$${deducciones.toLocaleString()}</td>
          <td style="font-weight:bold; background: rgba(255,255,255,0.05);">$${saldoAPagar.toLocaleString()}</td>
          <td><span style="background:${f.est_pago === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding:3px 6px; border-radius:4px;">${f.est_pago || 'PENDIENTE'}</span></td>
          <td style="color:#fbbf24;">${diasSinPagar} d</td>
          <td style="color:#60a5fa;">${diasSinCumplir} d</td>
          <td><a href="/editar/${c.id}" style="color:#3b82f6; text-decoration:none; font-weight:bold;">[GESTIONAR]</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
        <h2 style="color:#3b82f6;">YEGO ERP - TABLERO FINANCIERO INTEGRAL</h2>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden;">
          <thead style="background:#1e40af; text-align:center;">
            <tr>
              <th style="padding:12px;">ID</th><th>PLACA</th><th>FLETE</th><th>DEDUCC.</th><th>SALDO A PAGAR</th><th>ESTADO</th><th>DÍAS PAGO</th><th>DÍAS CUMP.</th><th>ACCION</th>
            </tr>
          </thead>
          <tbody style="text-align:center;">${filas}</tbody>
        </table>
      </body>`);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:1000px; margin:auto; background:#1e293b; padding:25px; border-radius:15px; border:1px solid #3b82f6;">
        <h2 style="text-align:center; color:#3b82f6;">GESTIÓN INTEGRAL CARGA #${req.params.id}</h2>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px;">
          
          <fieldset style="border:1px solid #334155; padding:15px; border-radius:8px; grid-column: span 3; display:grid; grid-template-columns: repeat(5, 1fr); gap:10px;">
            <legend style="color:#fbbf24; padding:0 10px;">CONTROL DE ANTICIPOS</legend>
            <label style="font-size:11px;">TIPO ANTICIPO<input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #475569;"></label>
            <label style="font-size:11px;">VALOR ($)<input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:5px; background:#0f172a; color:#ef4444; border:1px solid #475569;"></label>
            <label style="font-size:11px;">SOBRE ANTICIPO ($)<input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:5px; background:#0f172a; color:#ef4444; border:1px solid #475569;"></label>
            <label style="font-size:11px;">ESTADO ANT.<select name="estado_anticipo" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #475569;">
                <option ${f.estado_anticipo==='PENDIENTE'?'selected':''}>PENDIENTE</option>
                <option ${f.estado_anticipo==='PAGADO'?'selected':''}>PAGADO</option>
            </select></label>
            <label style="font-size:11px;">FECHA PAGO ANT.<input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo || ''}" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #475569;"></label>
          </fieldset>

          <fieldset style="border:1px solid #334155; padding:15px; border-radius:8px; grid-column: span 2;">
            <legend style="color:#3b82f6; padding:0 10px;">CUMPLIDOS Y DOCUMENTACIÓN</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
                <label style="font-size:11px;">TIPO CUMPLIDO<input type="text" name="tipo_cumplido" value="${f.tipo_cumplido || ''}" placeholder="Ej: Físico/Digital" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #475569;"></label>
                <label style="font-size:11px;">FECHA CUMP. VIRTUAL<input type="date" name="fecha_cumplido_virtual" value="${f.fecha_cumplido_virtual || ''}" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #475569;"></label>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; font-size:11px;">
                <label><input type="checkbox" name="ent_manifiesto" ${f.ent_manifiesto?'checked':''}> Manifiesto</label>
                <label><input type="checkbox" name="ent_remesa" ${f.ent_remesa?'checked':''}> Remesa</label>
                <label><input type="checkbox" name="ent_hoja_tiempos" ${f.ent_hoja_tiempos?'checked':''}> Hoja Tiempos</label>
                <label><input type="checkbox" name="ent_docs_cliente" ${f.ent_docs_cliente?'checked':''}> Docs Cliente</label>
                <label><input type="checkbox" name="ent_facturas" ${f.ent_facturas?'checked':''}> Facturas</label>
                <label><input type="checkbox" name="ent_tirilla_vacio" ${f.ent_tirilla_vacio?'checked':''}> Tirilla Vacío</label>
                <label><input type="checkbox" name="ent_tiquete_cargue" ${f.ent_tiquete_cargue?'checked':''}> Tiq. Cargue</label>
                <label><input type="checkbox" name="ent_tiquete_descargue" ${f.ent_tiquete_descargue?'checked':''}> Tiq. Descargue</label>
            </div>
          </fieldset>

          <fieldset style="border:1px solid #334155; padding:15px; border-radius:8px;">
            <legend style="color:#ef4444; padding:0 10px;">NOVEDADES</legend>
            <label style="font-size:11px;">¿PRESENTA NOVEDADES?
              <select name="presenta_novedad" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #475569;">
                <option ${f.presenta_novedad==='NO'?'selected':''}>NO</option>
                <option ${f.presenta_novedad==='SI'?'selected':''}>SI</option>
              </select>
            </label>
            <label style="font-size:11px; margin-top:10px; display:block;">OBS. NOVEDAD
                <textarea name="obs_novedad" style="width:100%; background:#0f172a; color:white; border:1px solid #475569; border-radius:4px;">${f.obs_novedad || ''}</textarea>
            </label>
            <label style="font-size:11px; margin-top:10px; display:block;">VALOR DESCUENTO ($)
                <input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; padding:5px; background:#0f172a; color:#ef4444; border:1px solid #475569;">
            </label>
          </fieldset>

          <fieldset style="border:1px solid #334155; padding:15px; border-radius:8px; grid-column: span 3; display:grid; grid-template-columns: repeat(4, 1fr); gap:15px; background: rgba(59, 130, 246, 0.05);">
            <legend style="color:#10b981; padding:0 10px; font-weight:bold;">LIQUIDACIÓN Y PAGO FINAL</legend>
            <label style="font-size:11px;">FLETE CONDUCTOR<input type="number" name="v_flete" value="${f.v_flete}" style="width:100%; padding:8px; background:#0f172a; color:#10b981; font-weight:bold; border:1px solid #334155;"></label>
            <label style="font-size:11px;">RETEFUENTE<input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; padding:8px; background:#0f172a; color:#fbbf24; border:1px solid #334155;"></label>
            <label style="font-size:11px;">RETEICA<input type="number" name="reteica" value="${f.reteica}" style="width:100%; padding:8px; background:#0f172a; color:#fbbf24; border:1px solid #334155;"></label>
            <label style="font-size:11px;">ESTADO PAGO FINAL
                <select name="est_pago" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;">
                    <option ${f.est_pago==='PENDIENTE'?'selected':''}>PENDIENTE</option>
                    <option ${f.est_pago==='PAGADO'?'selected':''}>PAGADO</option>
                </select>
            </label>
            <label style="font-size:11px;">FECHA CUMP. DOCS<input type="date" name="fecha_cumplido_docs" value="${f.fecha_cumplido_docs || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></label>
            <label style="font-size:11px;">FECHA LEGALIZACIÓN<input type="date" name="fecha_legalizacion" value="${f.fecha_legalizacion || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></label>
            <label style="font-size:11px;">FECHA PAGO REAL<input type="date" name="fecha_pago_real" value="${f.fecha_pago_real || ''}" style="width:100%; padding:8px; background:#0f172a; color:white; border:1px solid #334155;"></label>
            <label style="font-size:11px;">NRO FACTURA CLIENTE<input type="text" name="nro_factura" value="${f.nro_factura || ''}" style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155;"></label>
          </fieldset>

        </div>

        <button type="submit" style="width:100%; padding:15px; margin-top:20px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:16px;">GUARDAR GESTIÓN INTEGRAL</button>
        <p style="text-align:center;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver</a></p>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  const data = req.body;
  // Convertir Checkboxes de 'on' a true/false
  const checks = ['ent_manifiesto', 'ent_remesa', 'ent_hoja_tiempos', 'ent_docs_cliente', 'ent_facturas', 'ent_tirilla_vacio', 'ent_tiquete_cargue', 'ent_tiquete_descargue'];
  checks.forEach(key => data[key] = data[key] === 'on');
  
  await Finanza.update(data, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GESTIÓN INTEGRAL ACTIVADA')));
