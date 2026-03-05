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

// Modelo con nombres exactos según tus imágenes de diagnóstico
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true, field: 'cargaId' },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas', timestamps: false });

app.get('/', async (req, res) => {
  try {
    // SQL REFORZADO: Usamos TRIM y CAST para asegurar que el ID #225 de una tabla
    // sea EXACTAMENTE IGUAL al ID #225 de la otra tabla.
    const sql = `
      SELECT 
        c.id AS "main_id", 
        c.placa, 
        c."f_doc", 
        c."createdAt", 
        c.oficina, 
        c.orig, 
        c.dest, 
        c.cli,
        COALESCE(f.v_flete, 0) as v_flete, 
        COALESCE(f.v_facturar, 0) as v_facturar, 
        COALESCE(f.saldo_a_pagar, 0) as saldo_a_pagar, 
        f.est_pago
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON TRIM(CAST(c.id AS TEXT)) = TRIM(CAST(f."cargaId" AS TEXT))
      WHERE c.placa IS NOT NULL AND c.placa != '' 
      ORDER BY c.id DESC LIMIT 100`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    let totalPendiente = 0;
    let filas = datos.map(c => {
      const fecha = c.f_doc || c.createdAt || '---';
      const fleteP = parseFloat(c.v_flete);
      const fleteF = parseFloat(c.v_facturar);
      const saldo = parseFloat(c.saldo_a_pagar);

      if ((c.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += fleteP;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 11px; text-align: center;">
          <td style="padding:10px; color:#94a3b8;">#${c.main_id}</td>
          <td style="padding:10px;">${fecha}</td>
          <td style="padding:10px;">${c.oficina || '---'}</td>
          <td style="padding:10px;">${c.orig || '---'} - ${c.dest || '---'}</td>
          <td style="padding:10px; font-weight:bold; color:#3b82f6;">${c.placa}</td>
          <td style="padding:10px; color:#10b981; font-weight:bold;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="padding:10px; color:#3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="padding:10px; font-weight:bold; color:#fbbf24;">$${saldo.toLocaleString('es-CO')}</td>
          <td style="padding:10px;">
            <a href="/editar/${c.main_id}" style="background:#3b82f6; color:white; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:10px;">[GESTIONAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:20px; border-radius:12px; border:1px solid #334155; margin-bottom:20px;">
          <h2 style="margin:0; color:#3b82f6;">YEGO SISTEMA CONTABLE</h2>
          <div style="text-align:right;">
            <span style="color:#ef4444; font-size:12px; font-weight:bold;">PENDIENTE TOTAL</span><br>
            <span style="font-size:26px; font-weight:bold;">$ ${totalPendiente.toLocaleString('es-CO')}</span>
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden;">
          <thead style="background:#1e40af; color:white;">
            <tr>
              <th style="padding:15px;">ID</th><th>FECHA</th><th>OFICINA</th><th>RUTA</th>
              <th>PLACA</th><th>FLETE P.</th><th>FLETE F.</th><th>SALDO</th><th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// RUTA PARA GUARDAR: Es vital usar esta ruta para que los valores dejen de ser $0
app.post('/guardar/:id', async (req, res) => {
  try {
    await Finanza.upsert({
      cargaId: req.params.id,
      v_flete: req.body.v_flete || 0,
      v_facturar: req.body.v_facturar || 0,
      saldo_a_pagar: req.body.saldo_a_pagar || 0
    });
    res.redirect('/');
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:white; font-family:sans-serif; display:flex; justify-content:center; padding-top:50px;">
      <form action="/guardar/${req.params.id}" method="POST" style="background:#1e293b; padding:30px; border-radius:15px; border:1px solid #3b82f6; width:350px;">
        <h2 style="color:#3b82f6; text-align:center;">Carga #${req.params.id}</h2>
        <label>Flete a Pagar:</label><br>
        <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155;"><br>
        <label>Flete a Facturar:</label><br>
        <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155;"><br>
        <label>Saldo Final:</label><br>
        <input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:#10b981; border:1px solid #10b981;"><br><br>
        <button type="submit" style="width:100%; padding:15px; background:#3b82f6; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">ACTUALIZAR VALORES</button>
        <p style="text-align:center;"><a href="/" style="color:#64748b; text-decoration:none; font-size:12px;">← Volver al listado</a></p>
      </form>
    </body>`);
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 LISTO')));
