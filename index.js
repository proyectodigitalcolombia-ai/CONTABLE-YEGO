const express = require('express');
const { Sequelize, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. CONEXIÓN DIRECTA
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// 2. RUTA PRINCIPAL
app.get('/', async (req, res) => {
  try {
    // Crear tabla de finanzas si no existe
    await db.query('CREATE TABLE IF NOT EXISTS "Yego_Finanzas" ("cargaId" INTEGER UNIQUE, "v_flete" DECIMAL(15,2) DEFAULT 0, "est_pago" VARCHAR(255) DEFAULT \'PENDIENTE\')');

    // Consultas directas
    const cargas = await db.query('SELECT * FROM "Cargas" ORDER BY "ID" DESC LIMIT 100', { type: QueryTypes.SELECT });
    const finanzas = await db.query('SELECT * FROM "Yego_Finanzas"', { type: QueryTypes.SELECT });

    let filas = cargas.map(c => {
      const f = finanzas.find(fin => fin.cargaId === c.ID);
      const flete = f ? Number(f.v_flete).toLocaleString() : "0";
      const estado = f ? f.est_pago : "PENDIENTE";
      const color = estado === 'PAGADO' ? '#065f46' : '#7f1d1d';

      return `
        <tr style="border-bottom:1px solid #334155">
          <td style="padding:12px">#${c.ID}</td>
          <td><b>${c.PLACA || '---'}</b></td>
          <td>${c.CLIENTE || '---'}</td>
          <td>${c["FECHA DESPACHO"] || '---'}</td>
          <td style="color:#10b981; font-weight:bold">$ ${flete}</td>
          <td><span style="background:${color}; padding:4px 8px; border-radius:5px; font-size:11px">${estado}</span></td>
          <td><a href="/editar/${c.ID}" style="color:#3b82f6; text-decoration:none; font-weight:bold">LIQUIDAR</a></td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding:20px">
        <h2 style="color:#3b82f6">📊 CONTROL CONTABLE YEGO</h2>
        <table style="width:100%; border-collapse:collapse; background:#1e293b; border-radius:10px; overflow:hidden">
          <thead style="background:#1e40af">
            <tr><th>ID</th><th>PLACA</th><th>CLIENTE</th><th>DESPACHO</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>`);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// 3. RUTA EDITAR
app.get('/editar/:id', async (req, res) => {
  const id = req.params.id;
  const resultados = await db.query('SELECT * FROM "Yego_Finanzas" WHERE "cargaId" = ?', {
    replacements: [id], type: QueryTypes.SELECT
  });
  const f = resultados[0];
  
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; padding:50px; font-family:sans-serif">
      <form action="/guardar/${id}" method="POST" style="background:#1e293b; padding:25px; border-radius:15px; max-width:300px; margin:auto; border:1px solid #3b82f6">
        <h3>Servicio #${id}</h3>
        Valor Flete: <input type="number" name="v_flete" value="${f ? f.v_flete : 0}" step="0.01" style="width:100%; padding:10px; margin:10px 0">
        Estado: <select name="est_pago" style="width:100%; padding:10px; margin:10px 0">
          <option ${f?.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f?.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select>
        <button type="submit" style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-top:10px">GUARDAR</button>
      </form>
    </body>`);
});

// 4. RUTA GUARDAR
app.post('/guardar/:id', async (req, res) => {
  const { v_flete, est_pago } = req.body;
  const id = req.params.id;
  
  await db.query('INSERT INTO "Yego_Finanzas" ("cargaId", "v_flete", "est_pago") VALUES (?, ?, ?) ON CONFLICT ("cargaId") DO UPDATE SET "v_flete" = EXCLUDED."v_flete", "est_pago" = EXCLUDED."est_pago"', {
    replacements: [id, v_flete, est_pago]
  });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 YEGO LISTO'));
