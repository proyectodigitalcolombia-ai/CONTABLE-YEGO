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

// MODELO CON ABSOLUTAMENTE TODOS LOS CAMPOS
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  nro_factura: { type: DataTypes.STRING },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT },
  // Campos solicitados
  tipo_anticipo: { type: DataTypes.STRING },
  valor_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sobre_anticipo: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  estado_anticipo: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  fecha_pago_anticipo: { type: DataTypes.DATEONLY },
  tipo_cumplido: { type: DataTypes.STRING },
  fecha_cumplido_virtual: { type: DataTypes.DATEONLY },
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
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const cargas = await db.query(`SELECT * FROM "Cargas" ORDER BY id DESC LIMIT 100`, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    const filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      
      // Lógica de cálculos rápidos
      const flete = Number(f.v_flete || 0);
      const desc = Number(f.valor_anticipo || 0) + Number(f.sobre_anticipo || 0) + Number(f.valor_descuento || 0) + Number(f.retefuente || 0) + Number(f.reteica || 0);
      const saldo = flete - desc;
      
      const hoy = new Date();
      const diasSinPagar = f.est_pago !== 'PAGADO' ? Math.floor((hoy - new Date(c.f_doc || hoy)) / 86400000) : 0;
      const diasSinCumplir = !f.fecha_cumplido_docs ? Math.floor((hoy - new Date(c.f_doc || hoy)) / 86400000) : 0;

      const check = (val) => val ? '✅' : '❌';

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 10px; white-space: nowrap;">
          <td style="padding:8px; background:#1e293b;">${c.id}</td>
          <td>${c.f_doc || ''}</td>
          <td style="font-weight:bold; color:#fbbf24;">${c.placa}</td>
          <td>${f.tipo_anticipo || ''}</td>
          <td style="color:#10b981;">$${Number(f.valor_anticipo).toLocaleString()}</td>
          <td style="color:#ef4444;">$${Number(f.sobre_anticipo).toLocaleString()}</td>
          <td>${f.estado_anticipo || ''}</td>
          <td>${f.fecha_pago_anticipo || ''}</td>
          <td>${f.tipo_cumplido || ''}</td>
          <td>${f.fecha_cumplido_virtual || ''}</td>
          <td>M:${check(f.ent_manifiesto)} R:${check(f.ent_remesa)} H:${check(f.ent_hoja_tiempos)} C:${check(f.ent_docs_cliente)} F:${check(f.ent_facturas)} V:${check(f.ent_tirilla_vacio)} TC:${check(f.ent_tiquete_cargue)} TD:${check(f.ent_tiquete_descargue)}</td>
          <td style="color:${f.presenta_novedad === 'SI' ? '#ef4444' : '#f1f5f9'}">${f.presenta_novedad}</td>
          <td>${f.obs_novedad || ''}</td>
          <td style="color:#ef4444;">$${Number(f.valor_descuento).toLocaleString()}</td>
          <td>${f.fecha_cumplido_docs || ''}</td>
          <td>${f.fecha_legalizacion || ''}</td>
          <td style="color:#fbbf24;">$${Number(f.retefuente).toLocaleString()}</td>
          <td style="color:#fbbf24;">$${Number(f.reteica).toLocaleString()}</td>
          <td style="font-weight:bold; background:#064e3b;">$${saldo.toLocaleString()}</td>
          <td style="font-weight:bold;">${f.est_pago || 'PENDIENTE'}</td>
          <td style="color:#ef4444;">${diasSinPagar}</td>
          <td style="color:#3b82f6;">${diasSinCumplir}</td>
          <td style="padding:5px;"><a href="/editar/${c.id}" style="color:#3b82f6; font-weight:bold;">[EDITAR]</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; margin:0; padding:10px;">
        <h2 style="color:#3b82f6; margin-bottom:10px;">TABLERO DE CONTROL TOTAL YEGO</h2>
        <div style="overflow-x:auto; border:1px solid #334155; border-radius:8px;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b; text-align:center;">
            <thead style="background:#1e40af; font-size:9px; text-transform:uppercase;">
              <tr>
                <th style="padding:10px;">ID</th><th>REGISTRO</th><th>PLACA</th>
                <th>TIPO ANT.</th><th>VALOR ANT.</th><th>SOBRE ANT.</th><th>EST. ANT.</th><th>F. PAGO ANT.</th>
                <th>TIPO CUMP.</th><th>F. VIRTUAL</th><th>CHECKLIST DOCS</th>
                <th>NOV?</th><th>OBS NOV.</th><th>DESC.</th>
                <th>F. DOCS</th><th>F. LEGAL.</th><th>RETE F.</th><th>RETE I.</th>
                <th style="background:#065f46;">SALDO PAGAR</th><th>ESTADO</th><th>D. MORA</th><th>D. CUMP</th>
                <th>...</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </body>`);
  } catch (err) { res.status(500).send(err.message); }
});

// EL FORMULARIO DE EDICIÓN (Mantiene todos los campos para poder alimentarlos)
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:800px; margin:auto; background:#1e293b; padding:20px; border-radius:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <h3 style="grid-column:span 2; color:#3b82f6; border-bottom:1px solid #334155;">GESTIÓN DE CARGA #${req.params.id}</h3>
        
        <label>Flete Conductor<input type="number" name="v_flete" value="${f.v_flete}" style="width:100%"></label>
        <label>Flete Facturar<input type="number" name="v_facturar" value="${f.v_facturar}" style="width:100%"></label>
        
        <label>Tipo Anticipo<input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%"></label>
        <label>Valor Anticipo<input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%"></label>
        <label>Sobre Anticipo<input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%"></label>
        <label>Estado Anticipo<input type="text" name="estado_anticipo" value="${f.estado_anticipo || ''}" style="width:100%"></label>
        
        <label>Presenta Novedad? (SI/NO)<input type="text" name="presenta_novedad" value="${f.presenta_novedad}" style="width:100%"></label>
        <label>Valor Descuento<input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%"></label>
        
        <label>Retefuente<input type="number" name="retefuente" value="${f.retefuente}" style="width:100%"></label>
        <label>ReteICA<input type="number" name="reteica" value="${f.reteica}" style="width:100%"></label>
        
        <div style="grid-column:span 2; background:rgba(255,255,255,0.05); padding:10px; border-radius:5px;">
          <p style="margin:0 0 10px 0; font-size:12px; color:#3b82f6;">CHECKLIST DE DOCUMENTOS (Marcar los entregados)</p>
          <label><input type="checkbox" name="ent_manifiesto" ${f.ent_manifiesto?'checked':''}> Manifiesto</label> | 
          <label><input type="checkbox" name="ent_remesa" ${f.ent_remesa?'checked':''}> Remesa</label> | 
          <label><input type="checkbox" name="ent_hoja_tiempos" ${f.ent_hoja_tiempos?'checked':''}> Hoja Tiempos</label> | 
          <label><input type="checkbox" name="ent_docs_cliente" ${f.ent_docs_cliente?'checked':''}> Docs Cliente</label><br>
          <label><input type="checkbox" name="ent_facturas" ${f.ent_facturas?'checked':''}> Facturas</label> | 
          <label><input type="checkbox" name="ent_tirilla_vacio" ${f.ent_tirilla_vacio?'checked':''}> Tirilla Vacío</label> | 
          <label><input type="checkbox" name="ent_tiquete_cargue" ${f.ent_tiquete_cargue?'checked':''}> Tiq. Cargue</label> | 
          <label><input type="checkbox" name="ent_tiquete_descargue" ${f.ent_tiquete_descargue?'checked':''}> Tiq. Descargue</label>
        </div>

        <label>Fecha Cumplido Docs<input type="date" name="fecha_cumplido_docs" value="${f.fecha_cumplido_docs || ''}" style="width:100%"></label>
        <label>Fecha Legalización<input type="date" name="fecha_legalizacion" value="${f.fecha_legalizacion || ''}" style="width:100%"></label>

        <button type="submit" style="grid-column:span 2; padding:10px; background:#3b82f6; border:none; color:white; font-weight:bold; cursor:pointer;">GUARDAR TODO</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  const data = req.body;
  const checks = ['ent_manifiesto','ent_remesa','ent_hoja_tiempos','ent_docs_cliente','ent_facturas','ent_tirilla_vacio','ent_tiquete_cargue','ent_tiquete_descargue'];
  checks.forEach(c => data[c] = data[c] === 'on');
  await Finanza.update(data, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync({ alter: true }).then(() => app.listen(PORT));
