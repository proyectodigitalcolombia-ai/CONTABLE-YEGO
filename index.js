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

// DEFINICIÓN DE TABLA AUXILIAR (No toca la original)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas', timestamps: false });

// FUNCIÓN DE EXTRACCIÓN MEJORADA
const getV = (obj, key) => {
  if (!obj) return null;
  const foundKey = Object.keys(obj).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
  return foundKey ? obj[foundKey] : null;
};

app.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT c.*, f.*, c.id AS main_id 
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON CAST(c.id AS TEXT) = CAST(f."cargaId" AS TEXT)
      ORDER BY c.id DESC LIMIT 50`; // Limitamos a 50 para el diagnóstico
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    // --- BLOQUE DE DIAGNÓSTICO ---
    if (datos.length > 0) {
      console.log("--- COLUMNAS DETECTADAS EN LA BASE DE DATOS ---");
      console.log(Object.keys(datos[0])); 
      console.log("-----------------------------------------------");
    }
    // -----------------------------

    let totalPendiente = 0;
    let filas = datos.map(c => {
      // Intentamos obtener el flete buscando por varios nombres posibles
      const fleteP = parseFloat(getV(c, 'v_flete') || getV(c, 'flete') || 0);
      const fleteF = parseFloat(getV(c, 'v_facturar') || getV(c, 'facturar') || 0);
      const saldo = parseFloat(getV(c, 'saldo_a_pagar') || getV(c, 'saldo') || 0);
      
      // Intentamos obtener la fecha buscando por varios nombres posibles
      const f_reg = getV(c, 'f_doc') || getV(c, 'fecha') || getV(c, 'createdat') || '---';
      const idCarga = getV(c, 'main_id') || getV(c, 'id');

      if((getV(c, 'est_pago') || 'PENDIENTE') === 'PENDIENTE') totalPendiente += fleteP;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 11px; text-align: center;">
          <td style="padding:10px;">#${idCarga}</td>
          <td style="padding:10px;">${f_reg}</td>
          <td style="padding:10px;">${getV(c, 'placa') || '---'}</td>
          <td style="padding:10px; color: #10b981;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="padding:10px; color: #3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="padding:10px; font-weight:bold; color: #10b981;">$${saldo.toLocaleString('es-CO')}</td>
          <td style="padding:10px;">
            <a href="/editar/${idCarga}" style="color: #3b82f6; text-decoration: none;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:20px;">
        <h2 style="color:#3b82f6;">MODO DIAGNÓSTICO YEGO</h2>
        <div style="background:#1e293b; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #ef4444;">
          <p>⚠️ <b>Si ves valores en $0 o fechas en "---":</b> Revisa la terminal donde corre el servidor. Allí imprimí los nombres reales de tus columnas.</p>
        </div>
        <table style="width:100%; border-collapse:collapse; background:#1e293b;">
          <thead style="background:#1e40af; color:white;">
            <tr>
              <th style="padding:10px;">ID</th><th>FECHA</th><th>PLACA</th><th>FLETE P.</th><th>FLETE F.</th><th>SALDO</th><th>ACCION</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/editar/:id', async (req, res) => {
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <form action="/guardar/${req.params.id}" method="POST" style="background:#1e293b; color:white; padding:20px;">
      <h3>LIQUIDAR CARGA #${req.params.id}</h3>
      FLETE PAGAR: <input type="number" name="v_flete" value="${f.v_flete}" step="0.01"><br><br>
      SALDO PAGAR: <input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01"><br><br>
      <button type="submit">GUARDAR</button>
    </form>`);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.upsert({ cargaId: req.params.id, ...req.body });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 DIAGNÓSTICO INICIADO')));
