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

// MODELO DEFINITIVO: AQUÍ ESTÁN TODAS LAS COLUMNAS QUE PEDISTE
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
  // Checklist de documentos
  entrega_manifiesto: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_remesa: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_hoja_tiempos: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_docs_cliente: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_facturas: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_tirilla_vacio: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_tiquete_cargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  entrega_tiquete_descargue: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Novedades y Fechas finales
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago_final: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

// Lógica de ReteICA por ciudad
function getTarifaICA(ciudad) {
  const c = (ciudad || '').toUpperCase();
  if (c.includes('BOGOTA')) return 0.00966;
  if (c.includes('CARTAGENA')) return 0.007;
  if (c.includes('BUENAVENTURA')) return 0.008;
  return 0.005; // Tarifa base
}

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 100`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let granTotalSaldo = 0;

    const filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      const flete = f ? Number(f.v_flete) : 0;
      const deducciones = f ? (Number(f.valor_anticipo) + Number(f.sobre_anticipo) + Number(f.valor_descuento) + Number(f.retefuente) + Number(f.reteica)) : 0;
      const saldo = flete - deducciones;
      const estado = f ? f.est_pago_final : 'PENDIENTE';
      
      if(estado === 'PENDIENTE') granTotalSaldo += saldo;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 12px;">
          <td style="padding:10px;">${c.id}</td>
          <td>${c.f_doc || '---'}</td>
          <td>${c.placa}</td>
          <td style="color: #10b981;">$${flete.toLocaleString()}</td>
          <td style="color: #ef4444;">$${deducciones.toLocaleString()}</td>
          <td style="font-weight:bold;">$${saldo.toLocaleString()}</td>
          <td><span style="background:${estado==='PAGADO'?'#065f46':'#7f1d1d'}; padding:4px 8px; border-radius:4px;">${estado}</span></td>
          <td><a href="/editar/${c.id}" style="color:#3b82f6; text-decoration:none;">[GESTIONAR]</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
        <div style="background:#1e293b; padding:20px; border-radius:10px; margin-bottom:20px; border:1px solid #334155; display:flex; justify-content:space-between;">
          <h2>YEGO ERP - CONTROL CONTABLE</h2>
          <div style="text-align:right;">SALDO POR PAGAR:<br><b style="font-size:24px; color:#ef4444;">$ ${granTotalSaldo.toLocaleString()}</b></div>
        </div>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden;">
          <thead style="background:#1e40af;">
            <tr><th style="padding:12px;">ID</th><th>FECHA</th><th>PLACA</th><th>FLETE</th><th>DESC.</th><th>SALDO</th><th>ESTADO</th><th>ACCION</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const carga = await db.query(`SELECT orig FROM "Cargas" WHERE id = ${req.params.id}`, { type: QueryTypes.SELECT });
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  
  const origen = carga[0]?.orig || 'BOGOTA';
  const tarifaICA = getTarifaICA(origen);
  const fleteVal = Number(f.v_flete) || 0;

  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:900px; margin:auto; background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:10px;">GESTIÓN CARGA #${req.params.id}</h2>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px;">
          
          <section style="grid-column: span 3; display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; background:rgba(255,255,255,0.03); padding:15px; border-radius:8px;">
            <label>Flete Conductor<input type="number" name="v_flete" value="${f.v_flete}" style="width:100%; padding:8px; background:#0f172a; border:1px solid #475569; color:#10b981;"></label>
            <label>Valor Facturar<input type="number" name="v_facturar" value="${f.v_facturar}" style="width:100%; padding:8px; background:#0f172a; border:1px solid #475569; color:white;"></label>
            <label>Anticipo<input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; padding:8px; background:#0f172a; border:1px solid #475569; color:#ef4444;"></label>
            <label>Sobre Anticipo<input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; padding:8px; background:#0f172a; border:1px solid #475569; color:#ef4444;"></label>
          </section>

          <fieldset style="grid-column: span 2; border:1px solid #334155; padding:15px; border-radius:8px;">
            <legend style="color:#fbbf24;">CHECKLIST DOCUMENTACIÓN</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; font-size:13px;">
              <label><input type="checkbox" name="entrega_manifiesto" ${f.entrega_manifiesto?'checked':''}> Manifiesto</label>
              <label><input type="checkbox" name="entrega_remesa" ${f.entrega_remesa?'checked':''}> Remesa</label>
              <label><input type="checkbox" name="entrega_hoja_tiempos" ${f.entrega_hoja_tiempos?'checked':''}> Hoja Tiempos</label>
              <label><input type="checkbox" name="entrega_docs_cliente" ${f.entrega_docs_cliente?'checked':''}> Docs Cliente</label>
              <label><input type="checkbox" name="entrega_facturas" ${f.entrega_facturas?'checked':''}> Facturas</label>
              <label><input type="checkbox" name="entrega_tirilla_vacio" ${f.entrega_tirilla_vacio?'checked':''}> Tirilla Vacío</label>
            </div>
          </fieldset>

          <div style="border:1px solid #334155; padding:15px; border-radius:8px;">
            <label>Cumplido Virtual<input type="date" name="fecha_cumplido_virtual" value="${f.fecha_cumplido_virtual || ''}" style="width:100%; margin-bottom:10px;"></label>
            <label>Estado Pago Final
              <select name="est_pago_final" style="width:100%; padding:8px; background:#10b981; color:white; font-weight:bold;">
                <option ${f.est_pago_final==='PENDIENTE'?'selected':''}>PENDIENTE</option>
                <option ${f.est_pago_final==='PAGADO'?'selected':''}>PAGADO</option>
              </select>
            </label>
          </div>

          <section style="grid-column: span 3; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; border-top:1px dashed #334155; pt:15px;">
            <label>Retefuente (1%)<input type="number" name="retefuente" value="${f.retefuente > 0 ? f.retefuente : (fleteVal * 0.01).toFixed(0)}" style="width:100%; padding:8px; background:#0f172a; color:#fbbf24;"></label>
            <label>ReteICA (${origen})<input type="number" name="reteica" value="${f.reteica > 0 ? f.reteica : (fleteVal * tarifaICA).toFixed(0)}" style="width:100%; padding:8px; background:#0f172a; color:#fbbf24;"></label>
            <label>Deducciones/Novedades<input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; padding:8px; background:#0f172a; color:#ef4444;"></label>
          </section>

        </div>

        <button type="submit" style="width:100%; padding:15px; margin-top:20px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">ACTUALIZAR LIQUIDACIÓN</button>
        <a href="/" style="display:block; text-align:center; margin-top:15px; color:#94a3b8; text-decoration:none;">Cancelar y Volver</a>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  const data = req.body;
  // Convertir los checkboxes de 'on' a true/false
  const checks = ['entrega_manifiesto', 'entrega_remesa', 'entrega_hoja_tiempos', 'entrega_docs_cliente', 'entrega_facturas', 'entrega_tirilla_vacio'];
  checks.forEach(c => data[c] = data[c] === 'on');

  await Finanza.update(data, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
// Usamos alter: true para que Sequelize cree las columnas que faltan sin borrar los datos
db.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log('🚀 Sistema de Finanzas YEGO Activo'));
});
