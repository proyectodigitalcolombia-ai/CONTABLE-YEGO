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

// MODELO: Forzamos el uso de comillas dobles en los nombres de columna
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true, field: '"cargaId"' },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: '"v_flete"' },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: '"v_facturar"' },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: '"saldo_a_pagar"' },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE', field: '"est_pago"' }
}, { tableName: 'Yego_Finanzas', timestamps: false });

app.get('/', async (req, res) => {
  try {
    // SQL con comillas dobles obligatorias para respetar las mayúsculas de tu DB
    const sql = `
      SELECT 
        c.id, 
        c.placa, 
        c."f_doc", 
        c."createdAt", 
        c.oficina, 
        c.orig, 
        c.dest, 
        c.cli,
        f."v_flete", 
        f."v_facturar", 
        f."saldo_a_pagar", 
        f."est_pago"
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON CAST(c.id AS TEXT) = CAST(f."cargaId" AS TEXT)
      WHERE c.placa IS NOT NULL AND c.placa != '' 
      ORDER BY c.id DESC LIMIT 100`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    let totalPendiente = 0;
    let filas = datos.map(c => {
      // Usamos los nombres exactos con mayúsculas
      const fecha = c.f_doc || c.createdAt || '---';
      const fleteP = parseFloat(c.v_flete || 0);
      const fleteF = parseFloat(c.v_facturar || 0);
      const saldo = parseFloat(c.saldo_a_pagar || 0);

      if ((c.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += fleteP;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 11px; text-align: center;">
          <td style="padding:10px; color:#94a3b8;">#${c.id}</td>
          <td style="padding:10px;">${fecha}</td>
          <td style="padding:10px;">${c.oficina || '---'}</td>
          <td style="padding:10px;">${c.orig || '---'} - ${c.dest || '---'}</td>
          <td style="padding:10px; font-weight:bold; color:#3b82f6;">${c.placa}</td>
          <td style="padding:10px; color:#10b981;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="padding:10px; color:#3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="padding:10px; font-weight:bold; color:#fbbf24;">$${saldo.toLocaleString('es-CO')}</td>
          <td style="padding:10px;">
            <a href="/editar/${c.id}" style="color:#3b82f6; text-decoration:none; font-weight:bold;">[GESTIONAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; padding:20px; border-radius:10px; border:1px solid #334155; margin-bottom:20px;">
          <h2 style="margin:0; color:#3b82f6;">YEGO SISTEMA CONTABLE</h2>
          <div style="text-align:right;">
            <span style="color:#ef4444; font-size:12px; font-weight:bold;">PENDIENTE TOTAL</span><br>
            <span style="font-size:24px; font-weight:bold;">$ ${totalPendiente.toLocaleString('es-CO')}</span>
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden;">
          <thead style="background:#1e40af; color:white;">
            <tr>
              <th style="padding:12px;">ID</th><th>FECHA</th><th>OFICINA</th><th>RUTA</th>
              <th>PLACA</th><th>FLETE P.</th><th>FLETE F.</th><th>SALDO</th><th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) { res.status(500).send("<h1>Error detectado:</h1><p>" + err.message + "</p>"); }
});

// Ruta para guardar respetando comillas
app.post('/guardar/:id', async (req, res) => {
  try {
    const { v_flete, v_facturar, saldo_a_pagar } = req.body;
    const query = `
      INSERT INTO "Yego_Finanzas" ("cargaId", "v_flete", "v_facturar", "saldo_a_pagar", "est_pago")
      VALUES (:id, :flete, :facturar, :saldo, 'PENDIENTE')
      ON CONFLICT ("cargaId") 
      DO UPDATE SET "v_flete" = EXCLUDED."v_flete", "v_facturar" = EXCLUDED."v_facturar", "saldo_a_pagar" = EXCLUDED."saldo_a_pagar"`;
    
    await db.query(query, {
      replacements: { id: req.params.id, flete: v_flete, facturar: v_facturar, saldo: saldo_a_pagar },
      type: QueryTypes.INSERT
    });
    res.redirect('/');
  } catch (err) { res.status(500).send("Error al guardar: " + err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const result = await db.query('SELECT * FROM "Yego_Finanzas" WHERE "cargaId" = :id', {
    replacements: { id: req.params.id },
    type: QueryTypes.SELECT
  });
  const f = result[0] || { v_flete: 0, v_facturar: 0, saldo_a_pagar: 0 };
  res.send(`
    <form action="/guardar/${req.params.id}" method="POST" style="background:#1e293b; color:white; padding:30px; max-width:400px; margin:50px auto; border-radius:10px; font-family:sans-serif;">
      <h2 style="color:#3b82f6;">Liquidación #${req.params.id}</h2>
      Flete a Pagar: <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155;">
      Flete a Facturar: <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155;">
      Saldo a Pagar: <input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:#10b981; border:1px solid #10b981;">
      <button type="submit" style="width:100%; padding:15px; background:#3b82f6; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; margin-top:10px;">GUARDAR</button>
    </form>`);
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 SISTEMA REPARADO')));
