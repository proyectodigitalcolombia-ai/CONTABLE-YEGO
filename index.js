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

// MODELO DE FINANZAS (MANUAL - Solo vive aquí)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  nro_factura: { type: DataTypes.STRING },
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  // Checklist con nombres cortos para evitar errores de sistema
  ent_manifiesto: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_remesa: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_hoja_tiempos: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_docs_cliente: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_facturas: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tirilla_vacio: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tiquete_cargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  ent_tiquete_descargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  presenta_novedad: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas_Manual' }); // Nombre de tabla nuevo para evitar conflictos

const diffDias = (fecha) => {
  if (!fecha) return 0;
  const hoy = new Date();
  const f = new Date(fecha);
  const diff = Math.floor((hoy - f) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

app.get('/', async (req, res) => {
  try {
    // 1. Traemos SOLO lo que existe en la plataforma logística (Cargas)
    const sql = `SELECT id, f_doc, cli, placa, est_real FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 100`;
    const cargasPlataforma = await db.query(sql, { type: QueryTypes.SELECT });
    
    // 2. Traemos nuestra tabla de gestión manual
    const finanzasManuales = await Finanza.findAll();

    let granTotalPagar = 0;

    let filas = cargasPlataforma.map(c => {
      // Buscamos si ya tenemos datos manuales para esta carga
      const f = finanzasManuales.find(fin => fin.cargaId === c.id) || {};
      
      const vFlete = Number(f.v_flete || 0);
      const descuentos = Number(f.valor_anticipo || 0) + Number(f.sobre_anticipo || 0) + Number(f.valor_descuento || 0) + Number(f.retefuente || 0) + Number(f.reteica || 0);
      const saldo = vFlete - descuentos;
      const estado = f.est_pago || 'PENDIENTE';

      if(estado === 'PENDIENTE') granTotalPagar += saldo;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 11px; text-align:center;">
          <td style="padding:10px;">#${c.id}</td>
          <td>${c.f_doc || '---'}</td>
          <td>${c.placa}</td>
          <td style="color:#10b981; font-weight:bold;">$${vFlete.toLocaleString()}</td>
          <td style="color:#ef4444;">$${descuentos.toLocaleString()}</td>
          <td style="font-weight:bold; background:rgba(255,255,255,0.05);">$${saldo.toLocaleString()}</td>
          <td><span style="background:${estado === 'PAGADO' ? '#065f46' : '#7f1d1d'}; padding:3px 8px; border-radius:4px;">${estado}</span></td>
          <td style="color:#fbbf24;">${diffDias(c.f_doc)} d</td>
          <td><a href="/editar/${c.id}" style="color:#3b82f6; text-decoration:none; font-weight:bold;">[GESTIONAR]</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:20px; border-radius:10px; border:1px solid #334155; margin-bottom:20px;">
            <h2 style="margin:0; color:#3b82f6;">YEGO ERP - CONTROL FINANCIERO</h2>
            <div style="text-align:right;">
                <small style="color:#ef4444;">TOTAL SALDO PENDIENTE:</small><br>
                <b style="font-size:24px;">$ ${granTotalPagar.toLocaleString()}</b>
            </div>
        </div>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden;">
          <thead style="background:#1e40af;">
            <tr>
                <th style="padding:12px;">ID</th><th>REGISTRO</th><th>PLACA</th><th>FLETE</th><th>DEDUCC.</th><th>SALDO NETO</th><th>PAGO</th><th>DÍAS</th><th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) { res.status(500).send("Error de Base de Datos: " + err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:900px; margin:auto; background:#1e293b; padding:25px; border-radius:15px; border:1px solid #3b82f6;">
        <h3 style="color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:10px;">Gestión de Liquidación - Carga #${req.params.id}</h3>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px;">
          <div style="grid-column: span 3; display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; background:rgba(0,0,0,0.2); padding:15px; border-radius:8px;">
            <label style="font-size:11px;">FLETE CONDUCTOR<input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#10b981; border:1px solid #334155;"></label>
            <label style="font-size:11px;">VALOR FACTURAR<input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:8px; background:#0f172a; color:#3b82f6; border:1px solid #334155;"></label>
            <label style="font-size:11px;">RETEFUENTE<input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; padding:8px; background:#0f172a; color:#fbbf24; border:1px solid #334155;"></label>
            <label style="font-size:11px;">RETEICA<input type="number" name="reteica" value="${f.reteica}" style="width:100%; padding:8px; background:#0f172a; color:#fbbf24; border:1px solid #334155;"></label>
          </div>

          <fieldset style="grid-column: span 2; border:1px solid #334155; border-radius:8px; padding:15px;">
            <legend style="color:#fbbf24; font-size:12px;">ANTICIPOS</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <label style="font-size:11px;">TIPO<input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #334155;"></label>
                <label style="font-size:11px;">VALOR ($)<input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:5px; background:#0f172a; color:#ef4444; border:1px solid #334155;"></label>
                <label style="font-size:11px;">SOBRE ANTICIPO ($)<input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:5px; background:#0f172a; color:#ef4444; border:1px solid #334155;"></label>
                <label style="font-size:11px;">FECHA PAGO ANT.<input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo || ''}" style="width:100%; padding:5px; background:#0f172a; color:white; border:1px solid #334155;"></label>
            </div>
          </fieldset>

          <fieldset style="border:1px solid #334155; border-radius:8px; padding:15px;">
            <legend style="color:#3b82f6; font-size:12px;">DOCUMENTOS</legend>
            <div style="font-size:10px; display:grid; grid-template-columns: 1fr; gap:2px;">
                <label><input type="checkbox" name="ent_manifiesto" ${f.ent_manifiesto?'checked':''}> Manifiesto</label>
                <label><input type="checkbox" name="ent_remesa" ${f.ent_remesa?'checked':''}> Remesa</label>
                <label><input type="checkbox" name="ent_hoja_tiempos" ${f.ent_hoja_tiempos?'checked':''}> Hoja Tiempos</label>
                <label><input type="checkbox" name="ent_tirilla_vacio" ${f.ent_tirilla_vacio?'checked':''}> Tirilla Vacío</label>
                <label><input type="checkbox" name="ent_tiquete_cargue" ${f.ent_tiquete_cargue?'checked':''}> Tiq. Cargue</label>
            </div>
          </fieldset>

          <div style="grid-column: span 3; background:rgba(16, 185, 129, 0.1); padding:15px; border-radius:8px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px;">
            <label style="font-size:11px;">ESTADO PAGO FINAL
                <select name="est_pago" style="width:100%; padding:8px; background:#0f172a; color:white;">
                    <option ${f.est_pago==='PENDIENTE'?'selected':''}>PENDIENTE</option>
                    <option ${f.est_pago==='PAGADO'?'selected':''}>PAGADO</option>
                </select>
            </label>
            <label style="font-size:11px;">FECHA PAGO REAL<input type="date" name="fecha_pago_real" value="${f.fecha_pago_real || ''}" style="width:100%; padding:8px; background:#0f172a; color:white;"></label>
            <label style="font-size:11px;">NRO FACTURA<input type="text" name="nro_factura" value="${f.nro_factura || ''}" style="width:100%; padding:8px; background:#0f172a; color:white;"></label>
          </div>
        </div>

        <button type="submit" style="width:100%; padding:15px; margin-top:20px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">ACTUALIZAR DATOS MANUALES</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  const data = req.body;
  const checks = ['ent_manifiesto', 'ent_remesa', 'ent_hoja_tiempos', 'ent_docs_cliente', 'ent_facturas', 'ent_tirilla_vacio', 'ent_tiquete_cargue', 'ent_tiquete_descargue'];
  checks.forEach(k => data[k] = data[k] === 'on');
  await Finanza.update(data, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 YEGO GESTIÓN MANUAL OK')));
