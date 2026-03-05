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

// MODELO AJUSTADO A TUS IMÁGENES
const Finanza = db.define('Finanza', {
  cargaId: { 
    type: DataTypes.INTEGER, 
    unique: true, 
    field: 'cargaId' // <--- COINCIDE CON TU IMAGEN
  },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas', timestamps: false });

app.get('/', async (req, res) => {
  try {
    // Usamos comillas dobles en "cargaId" para que Postgres no dé error
    const sql = `
      SELECT c.*, f.*, c.id AS main_id 
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON CAST(c.id AS TEXT) = CAST(f."cargaId" AS TEXT)
      WHERE c.placa IS NOT NULL AND c.placa != '' 
      ORDER BY c.id DESC LIMIT 150`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    let totalPendiente = 0;
    let filas = datos.map(c => {
      // LÓGICA DE FECHA: Si f_doc está vacío, usa createdAt
      const fechaFinal = c.f_doc || c.createdAt || '---';
      const fleteP = parseFloat(c.v_flete || 0);
      const fleteF = parseFloat(c.v_facturar || 0);
      const saldo = parseFloat(c.saldo_a_pagar || 0);

      if ((c.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += fleteP;

      const tdStyle = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle} color: #94a3b8;">#${c.main_id}</td>
          <td style="${tdStyle}">${fechaFinal}</td>
          <td style="${tdStyle}">${c.oficina || '---'}</td>
          <td style="${tdStyle}">${c.orig || '---'}</td>
          <td style="${tdStyle}">${c.dest || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle} background: rgba(59, 130, 246, 0.1); font-weight: bold;">${c.placa}</td>
          <td style="${tdStyle} color: #10b981; font-weight: bold;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${saldo.toLocaleString('es-CO')}</td>
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.main_id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="margin:0; color: #3b82f6;">YEGO CONTABLE FINAL</h2>
          <div style="text-align: right;">
            <small style="color:#ef4444; font-weight: bold;">TOTAL PENDIENTE:</small><br>
            <b style="color:#f1f5f9; font-size: 20px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b;">
            <thead style="background:#1e40af;">
              <tr>
                <th style="padding:12px;">ID</th><th>FECHA</th><th>OFICINA</th>
                <th>ORIGEN</th><th>DESTINO</th><th>CLIENTE</th><th>PLACA</th>
                <th>FLETE P.</th><th>FLETE F.</th><th>SALDO</th><th>ACCION</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// GUARDADO ROBUSTO
app.post('/guardar/:id', async (req, res) => {
  try {
    await Finanza.upsert({
      cargaId: req.params.id,
      v_flete: req.body.v_flete || 0,
      v_facturar: req.body.v_facturar || 0,
      saldo_a_pagar: req.body.saldo_a_pagar || 0
    });
    res.redirect('/');
  } catch (err) { res.status(500).send("Error al guardar: " + err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <form action="/guardar/${req.params.id}" method="POST" style="background:#1e293b; color:white; padding:30px; font-family:sans-serif; max-width:400px; margin:50px auto; border-radius:10px;">
      <h2 style="color:#3b82f6;">Liquidar #${req.params.id}</h2>
      <label>Flete a Pagar:</label><br>
      <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155;"><br>
      <label>Flete a Facturar:</label><br>
      <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155;"><br>
      <label>Saldo a Pagar:</label><br>
      <input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:#10b981; border:1px solid #10b981;"><br><br>
      <button type="submit" style="width:100%; padding:15px; background:#3b82f6; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">GUARDAR CAMBIOS</button>
    </form>`);
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 LISTO')));
