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

// MODELO CON TODAS LAS COLUMNAS QUE PEDISTE
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  nro_factura: { type: DataTypes.STRING },
  fecha_pago_real: { type: DataTypes.DATEONLY },
  obs_contable: { type: DataTypes.TEXT },
  referencia_soporte: { type: DataTypes.STRING },
  
  // NUEVAS COLUMNAS SOLICITADAS
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
  presenta_novedades: { type: DataTypes.STRING, defaultValue: 'NO' },
  obs_novedad: { type: DataTypes.TEXT },
  valor_descuento: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  fecha_cumplido_docs: { type: DataTypes.DATEONLY },
  fecha_legalizacion: { type: DataTypes.DATEONLY },
  retefuente: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reteica: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, { tableName: 'Yego_Finanzas' });

app.get('/', async (req, res) => {
  try {
    const cargas = await db.query(`SELECT * FROM "Cargas" ORDER BY id DESC LIMIT 150`, { type: QueryTypes.SELECT });
    const finanzas = await Finanza.findAll();

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.id) || {};
      
      // Cálculos para la tabla
      const flete = Number(f.v_flete || 0);
      const deducciones = Number(f.valor_anticipo) + Number(f.sobre_anticipo) + Number(f.valor_descuento) + Number(f.retefuente) + Number(f.reteica);
      const saldoAPagar = flete - deducciones;
      
      const hoy = new Date();
      const fDoc = c.f_doc ? new Date(c.f_doc) : hoy;
      const diasSinPagar = f.est_pago !== 'PAGADO' ? Math.floor((hoy - fDoc) / (1000 * 60 * 60 * 24)) : 0;
      const diasSinCumplir = !f.fecha_cumplido_docs ? Math.floor((hoy - fDoc) / (1000 * 60 * 60 * 24)) : 0;

      const tdStyle = `padding: 8px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 10px;">
          <td style="${tdStyle}">${c.id}</td>
          <td style="${tdStyle}">${c.f_doc || '---'}</td>
          <td style="${tdStyle}">${c.placa}</td>
          <td style="${tdStyle}">${f.tipo_anticipo || '---'}</td>
          <td style="${tdStyle}">$${Number(f.valor_anticipo).toLocaleString()}</td>
          <td style="${tdStyle}">$${Number(f.sobre_anticipo).toLocaleString()}</td>
          <td style="${tdStyle}">${f.estado_anticipo || '---'}</td>
          <td style="${tdStyle}">${f.fecha_pago_anticipo || '---'}</td>
          <td style="${tdStyle}">${f.tipo_cumplido || '---'}</td>
          <td style="${tdStyle}">${f.fecha_cumplido_virtual || '---'}</td>
          <td style="${tdStyle}">${f.presenta_novedades || 'NO'}</td>
          <td style="${tdStyle}">$${Number(f.valor_descuento).toLocaleString()}</td>
          <td style="${tdStyle}; font-weight: bold; color: #10b981;">$${saldoAPagar.toLocaleString()}</td>
          <td style="${tdStyle}; font-weight: bold; color: #ef4444;">${diasSinPagar}</td>
          <td style="${tdStyle}; font-weight: bold; color: #3b82f6;">${diasSinCumplir}</td>
          <td style="${tdStyle}">${f.est_pago || 'PENDIENTE'}</td>
          <td style="padding: 8px; text-align: center;">
            <a href="/editar/${c.id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">GESTIONAR</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:15px; margin:0;">
        <h2 style="color: #3b82f6;">YEGO ERP CONTABLE - VISTA INTEGRAL</h2>
        <div style="overflow-x: auto; border: 1px solid #334155; border-radius: 8px;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b;">
            <thead style="background:#1e40af; font-size: 9px; text-transform: uppercase;">
              <tr>
                <th style="padding:10px;">ID</th><th>REGISTRO</th><th>PLACA</th>
                <th>TIPO ANT.</th><th>VALOR ANT.</th><th>SOBRE ANT.</th><th>ESTADO ANT.</th><th>F. PAGO ANT.</th>
                <th>TIPO CUMP.</th><th>F. VIRTUAL</th><th>NOVEDADES</th><th>DESC.</th>
                <th style="background: #064e3b;">SALDO PAGAR</th><th>DÍAS S. PAGO</th><th>DÍAS S. CUMP</th>
                <th>ESTADO</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </body>`);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
      <form action="/guardar/${req.params.id}" method="POST" style="max-width:950px; margin:auto; background:#1e293b; padding:25px; border-radius:15px; border:1px solid #3b82f6; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
        <h2 style="grid-column: span 3; color:#3b82f6; text-align:center; border-bottom:1px solid #334155; padding-bottom:10px;">GESTIÓN CARGA #${req.params.id}</h2>
        
        <div style="background: rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
          <p style="color:#fbbf24; font-weight:bold; margin:0 0 10px 0;">ANTICIPOS</p>
          <label style="font-size:10px;">TIPO DE ANTICIPO</label><input type="text" name="tipo_anticipo" value="${f.tipo_anticipo || ''}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">VALOR ANTICIPO</label><input type="number" name="valor_anticipo" value="${f.valor_anticipo}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">SOBRE ANTICIPO</label><input type="number" name="sobre_anticipo" value="${f.sobre_anticipo}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">ESTADO ANTICIPO</label><input type="text" name="estado_anticipo" value="${f.estado_anticipo || ''}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">FECHA PAGO ANTICIPO</label><input type="date" name="fecha_pago_anticipo" value="${f.fecha_pago_anticipo || ''}" style="width:100%;">
        </div>

        <div style="background: rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
          <p style="color:#3b82f6; font-weight:bold; margin:0 0 10px 0;">CUMPLIDOS Y DOCUMENTOS</p>
          <label style="font-size:10px;">TIPO DE CUMPLIDO</label><input type="text" name="tipo_cumplido" value="${f.tipo_cumplido || ''}" style="width:100%; margin-bottom:5px;">
          <label style="font-size:10px;">FECHA CUMPLIDO VIRTUAL</label><input type="date" name="fecha_cumplido_virtual" value="${f.fecha_cumplido_virtual || ''}" style="width:100%; margin-bottom:10px;">
          <div style="font-size:10px;">
            <label><input type="checkbox" name="ent_manifiesto" ${f.ent_manifiesto?'checked':''}> Manifiesto</label><br>
            <label><input type="checkbox" name="ent_remesa" ${f.ent_remesa?'checked':''}> Remesa</label><br>
            <label><input type="checkbox" name="ent_hoja_tiempos" ${f.ent_hoja_tiempos?'checked':''}> Hoja Tiempos</label><br>
            <label><input type="checkbox" name="ent_docs_cliente" ${f.ent_docs_cliente?'checked':''}> Docs Cliente</label><br>
            <label><input type="checkbox" name="ent_facturas" ${f.ent_facturas?'checked':''}> Facturas</label><br>
            <label><input type="checkbox" name="ent_tirilla_vacio" ${f.ent_tirilla_vacio?'checked':''}> Tirilla Vacío</label><br>
            <label><input type="checkbox" name="ent_tiquete_cargue" ${f.ent_tiquete_cargue?'checked':''}> Tiq. Cargue</label><br>
            <label><input type="checkbox" name="ent_tiquete_descargue" ${f.ent_tiquete_descargue?'checked':''}> Tiq. Descargue</label>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
          <p style="color:#ef4444; font-weight:bold; margin:0 0 10px 0;">NOVEDADES Y LIQUIDACIÓN</p>
          <label style="font-size:10px;">PRESENTA NOVEDADES?</label><input type="text" name="presenta_novedades" value="${f.presenta_novedades || 'NO'}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">VALOR DESCUENTO</label><input type="number" name="valor_descuento" value="${f.valor_descuento}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">RETEFUENTE</label><input type="number" name="retefuente" value="${f.retefuente}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">RETEICA</label><input type="number" name="reteica" value="${f.reteica}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">FECHA CUMPLIDO DOCS</label><input type="date" name="fecha_cumplido_docs" value="${f.fecha_cumplido_docs || ''}" style="width:100%; margin-bottom:10px;">
          <label style="font-size:10px;">FECHA LEGALIZACIÓN</label><input type="date" name="fecha_legalizacion" value="${f.fecha_legalizacion || ''}" style="width:100%;">
        </div>

        <button type="submit" style="grid-column: span 3; padding:15px; background:#3b82f6; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">GUARDAR CAMBIOS</button>
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
