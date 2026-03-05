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

// MODELO COMPLETO SEGÚN TU ESPECIFICACIÓN
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  
  // SECCIÓN ANTICIPOS
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING }, // PENDIENTE/PAGADO
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },

  // SECCIÓN CUMPLIDOS Y DOCUMENTACIÓN
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

  // SECCIÓN NOVEDADES
  presenta_novedades: { type: DataTypes.STRING }, // SÍ/NO
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  // SECCIÓN LIQUIDACIÓN FINAL
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago_final: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const sql = `SELECT * FROM "Cargas" WHERE placa IS NOT NULL AND placa != '' ORDER BY id DESC LIMIT 150`;
    const cargas = await db.query(sql, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    const filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id);
      
      // CÁLCULO DE SALDO A PAGAR: (Flete - Anticipo - SobreAnt - Descuento - Rete)
      const flete = f ? Number(f.v_flete) : 0;
      const anticipos = f ? (Number(f.valor_anticipo) + Number(f.sobre_anticipo)) : 0;
      const descuentos = f ? (Number(f.valor_descuento) + Number(f.retefuente) + Number(f.reteica)) : 0;
      const saldo = flete - anticipos - descuentos;

      // CÁLCULO DE DÍAS (Basado en f_doc o fecha_cumplido)
      const hoy = new Date();
      const registro = c.f_doc ? new Date(c.f_doc) : hoy;
      const diasSinPagar = Math.floor((hoy - registro) / (1000 * 60 * 60 * 24));

      const tdStyle = `padding: 6px; text-align: center; border-right: 1px solid #334155;`;

      return `
        <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle}">${c.id}</td>
          <td style="${tdStyle}">${c.f_doc || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle} font-weight:bold;">${c.placa}</td>
          <td style="${tdStyle} color:#10b981;">$${flete.toLocaleString()}</td>
          <td style="${tdStyle} color:#ef4444;">$${saldo.toLocaleString()}</td>
          <td style="${tdStyle}">${f ? f.est_pago_final : 'PENDIENTE'}</td>
          <td style="${tdStyle} color:#fbbf24;">${diasSinPagar} d</td>
          <td style="${tdStyle}">${c.est_real || '---'}</td>
          <td style="padding: 6px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold; background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px;">LIQUIDAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:15px; margin:0;">
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 5px solid #3b82f6;">
          <h2 style="margin:0;">Control de Liquidaciones y Cumplidos</h2>
        </div>
        <input type="text" id="buscador" placeholder="🔍 Filtrar placa..." style="width:100%; padding:10px; margin-bottom:15px; border-radius:5px; border:1px solid #334155; background:#1e293b; color:white;">
        <div style="overflow-x: auto; border: 1px solid #334155; border-radius: 8px;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b;">
            <thead style="background:#1e40af; font-size: 10px; text-transform: uppercase;">
              <tr>
                <th style="padding:10px; border-right: 1px solid #475569;">ID</th>
                <th style="border-right: 1px solid #475569;">REGISTRO</th>
                <th style="border-right: 1px solid #475569;">CLIENTE</th>
                <th style="border-right: 1px solid #475569;">PLACA</th>
                <th style="border-right: 1px solid #475569;">VALOR FLETE</th>
                <th style="border-right: 1px solid #475569;">SALDO A PAGAR</th>
                <th style="border-right: 1px solid #475569;">ESTADO PAGO</th>
                <th style="border-right: 1px solid #475569;">DÍAS S.P.</th>
                <th style="border-right: 1px solid #475569;">ESTADO LOG.</th>
                <th>GESTIÓN</th>
              </tr>
            </thead>
            <tbody id="tabla-cargas">${filas}</tbody>
          </table>
        </div>
        <script>
          document.getElementById('buscador').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.fila-carga').forEach(f => {
              f.style.display = f.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
          });
        </script>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:800px; margin:auto; background:#1e293b; padding:25px; border-radius:12px; border:1px solid #3b82f6;">
        <h3 style="text-align:center; color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:10px;">FICHA DE LIQUIDACIÓN #${req.params.id}</h3>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; margin-top:15px;">
          <fieldset style="grid-column: span 3; border: 1px solid #334155; border-radius: 8px; padding: 15px;">
            <legend style="color:#fbbf24; font-weight:bold;">1. GESTIÓN DE ANTICIPOS</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
              <label>Tipo Anticipo:<br><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569;"></label>
              <label>Valor Anticipo:<br><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; background:#0f172a; color:#10b981; border:1px solid #475569;"></label>
              <label>Sobre Anticipo:<br><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; background:#0f172a; color:#10b981; border:1px solid #475569;"></label>
              <label>Fecha Pago Ant.:<br><input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569;"></label>
              <label>Estado Anticipo:<br><select name="estado_anticipo" style="width:100%; background:#0f172a; color:white;"><option ${f.estado_anticipo==='PENDIENTE'?'selected':''}>PENDIENTE</option><option ${f.estado_anticipo==='PAGADO'?'selected':''}>PAGADO</option></select></label>
            </div>
          </fieldset>

          <fieldset style="grid-column: span 3; border: 1px solid #334155; border-radius: 8px; padding: 15px;">
            <legend style="color:#3b82f6; font-weight:bold;">2. CUMPLIDOS Y DOCUMENTACIÓN</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <label>Tipo Cumplido: <input type="text" name="tipo_cumplido" value="${f.tipo_cumplido || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569;"></label>
              <label>F. Cumplido Virtual: <input type="date" name="fecha_cumplido_virtual" value="${f.fecha_cumplido_virtual || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569;"></label>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px; margin-top:10px; font-size:11px;">
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

          <fieldset style="grid-column: span 3; border: 1px solid #334155; border-radius: 8px; padding: 15px;">
            <legend style="color:#ef4444; font-weight:bold;">3. NOVEDADES Y DESCUENTOS</legend>
            <div style="display:grid; grid-template-columns: 1fr 2fr 1fr; gap:10px;">
              <label>¿Novedad?: <select name="presenta_novedades" style="width:100%; background:#0f172a; color:white;"><option>NO</option><option ${f.presenta_novedades==='SÍ'?'selected':''}>SÍ</option></select></label>
              <label>Observación Novedad: <input type="text" name="obs_novedad" value="${f.obs_novedad || ''}" style="width:100%; background:#0f172a; color:white; border:1px solid #475569;"></label>
              <label>Valor Descuento: <input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; background:#0f172a; color:#ef4444; border:1px solid #475569;"></label>
            </div>
          </fieldset>

          <fieldset style="grid-column: span 3; border: 1px solid #10b981; border-radius: 8px; padding: 15px;">
            <legend style="color:#10b981; font-weight:bold;">4. LIQUIDACIÓN FINAL Y SALDOS</legend>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
              <label>Retefuente: <input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; background:#0f172a; color:white;"></label>
              <label>Reteica: <input type="number" name="reteica" value="${f.reteica}" style="width:100%; background:#0f172a; color:white;"></label>
              <label>Estado Final: <select name="est_pago_final" style="width:100%; background:#0f172a; color:white;"><option ${f.est_pago_final==='PENDIENTE'?'selected':''}>PENDIENTE</option><option ${f.est_pago_final==='PAGADO'?'selected':''}>PAGADO</option></select></label>
              <label>F. Cumplido Docs: <input type="date" name="fecha_cumplido_docs" value="${f.fecha_cumplido_docs || ''}" style="width:100%; background:#0f172a; color:white;"></label>
              <label>F. Legalización: <input type="date" name="fecha_legalizacion" value="${f.fecha_legalizacion || ''}" style="width:100%; background:#0f172a; color:white;"></label>
            </div>
          </fieldset>
        </div>

        <button type="submit" style="width:100%; padding:15px; margin-top:20px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">GUARDAR LIQUIDACIÓN COMPLETA</button>
        <p style="text-align:center;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver al Listado</a></p>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  // Convertimos los checkboxes a Booleanos
  const data = req.body;
  const fields = ['entrega_manifiesto', 'entrega_remesa', 'entrega_hoja_tiempos', 'entrega_docs_cliente', 'entrega_facturas', 'entrega_tirilla_vacio', 'entrega_tiquete_cargue', 'entrega_tiquete_descargue'];
  fields.forEach(field => data[field] = data[field] === 'on');
  
  await Finanza.update(data, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT, () => console.log('🚀 ERP YEGO FULL ACTIVADO')));
