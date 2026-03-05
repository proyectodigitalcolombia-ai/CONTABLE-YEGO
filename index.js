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

// Modelo con mapeo estricto para evitar errores de mayúsculas
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true, field: 'cargaId' },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas', timestamps: false });

app.get('/', async (req, res) => {
  try {
    // UNIÓN ULTRA-FORZADA: Limpiamos espacios y convertimos a TEXTO ambos lados
    const sql = `
      SELECT 
        c.id AS id_carga, 
        c.placa, 
        COALESCE(c.f_doc, c."createdAt") as fecha_final, 
        c.oficina, c.orig, c.dest, c.cli,
        COALESCE(f.v_flete, 0) as flete_p, 
        COALESCE(f.v_facturar, 0) as flete_f, 
        COALESCE(f.saldo_a_pagar, 0) as saldo_p, 
        f.est_pago
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON TRIM(CAST(c.id AS TEXT)) = TRIM(CAST(f."cargaId" AS TEXT))
      WHERE c.placa IS NOT NULL AND c.placa != '' 
      ORDER BY c.id DESC LIMIT 100`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    let totalPendiente = 0;
    let filas = datos.map(c => {
      const vFlete = parseFloat(c.flete_p);
      if ((c.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += vFlete;

      const tdStyle = `padding: 10px; text-align: center; border-bottom: 1px solid #334155;`;

      return `
        <tr style="font-size: 11px;">
          <td style="${tdStyle} color:#94a3b8;">#${c.id_carga}</td>
          <td style="${tdStyle}">${c.fecha_final || '---'}</td>
          <td style="${tdStyle}">${c.oficina || '---'}</td>
          <td style="${tdStyle} color:#3b82f6; font-weight:bold;">${c.placa}</td>
          <td style="${tdStyle} color:#10b981;">$${vFlete.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color:#3b82f6;">$${parseFloat(c.flete_f).toLocaleString('es-CO')}</td>
          <td style="${tdStyle} background:rgba(16,185,129,0.1); font-weight:bold; color:#10b981;">$${parseFloat(c.saldo_p).toLocaleString('es-CO')}</td>
          <td style="${tdStyle}">
            <a href="/editar/${c.id_carga}" style="background:#3b82f6; color:white; padding:4px 8px; border-radius:4px; text-decoration:none;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px;">
        <div style="background:#1e293b; padding:20px; border-radius:12px; border:1px solid #334155; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0; color:#3b82f6;">CONTROL FINANCIERO YEGO</h2>
          <div style="text-align:right;">
            <small style="color:#ef4444; font-weight:bold;">PENDIENTE TOTAL</small><br>
            <b style="font-size:24px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden;">
          <thead style="background:#1e40af;">
            <tr>
              <th style="padding:12px;">ID</th><th>FECHA</th><th>OFICINA</th><th>PLACA</th>
              <th>FLETE PAGAR</th><th>FLETE FACT.</th><th>SALDO</th><th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

// RUTA EDITAR: Vital para guardar datos reales
app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:white; font-family:sans-serif; padding:40px;">
      <form action="/guardar/${req.params.id}" method="POST" style="background:#1e293b; padding:30px; border-radius:15px; max-width:400px; margin:auto; border:1px solid #3b82f6;">
        <h2 style="text-align:center; color:#3b82f6;">Carga #${req.params.id}</h2>
        Flete a Pagar: <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:white; border:1px solid #334155;"><br>
        Saldo a Pagar: <input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01" style="width:100%; padding:10px; margin:10px 0; background:#0f172a; color:#10b981; border:1px solid #10b981;"><br><br>
        <button type="submit" style="width:100%; padding:15px; background:#3b82f6; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">GUARDAR Y VOLVER</button>
      </form>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.upsert({ cargaId: req.params.id, ...req.body });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Sistema Online')));
