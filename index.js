const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. CONEXIÓN (IMPORTANTE: quoteIdentifiers en false ayuda con las mayúsculas)
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  define: { quoteIdentifiers: false } 
});

// 2. MODELO CARGA - Usamos comillas dobles literales en los nombres de los campos
const Carga = db.define('Carga', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    field: '"ID"' // Forzamos las comillas dobles para Postgres
  },
  placa: { type: DataTypes.STRING, field: '"PLACA"' },
  cliente: { type: DataTypes.STRING, field: '"CLI"' },
  fecha: { type: DataTypes.STRING, field: '"F_D"' }
}, { 
  tableName: 'Cargas', 
  timestamps: false 
});

// 3. MODELO FINANZAS (Tu tabla de control)
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// 4. RUTA PRINCIPAL (HTML simple para evitar errores de Syntax)
app.get('/', async (req, res) => {
  try {
    const datos = await Carga.findAll({ include: [Finanza] });
    
    let filas = "";
    datos.forEach(c => {
      const flete = c.Finanza ? c.Finanza.v_flete : 0;
      const estado = c.Finanza ? c.Finanza.est_pago : 'PENDIENTE';
      
      filas += `
        <tr style="border-bottom: 1px solid #444;">
          <td style="padding:10px;">#${c.id}</td>
          <td>${c.placa || '---'}</td>
          <td>${c.cliente || '---'}</td>
          <td style="color:#10b981;">$ ${Number(flete).toLocaleString()}</td>
          <td><b>${estado}</b></td>
          <td><a href="/editar/${c.id}" style="color:#3b82f6;">GESTIONAR</a></td>
        </tr>`;
    });

    res.send(`
      <body style="background:#111; color:#eee; font-family:sans-serif; padding:40px;">
        <h1>💰 Control Contable YEGO</h1>
        <table style="width:100%; border-collapse:collapse;">
          <thead style="background:#222;">
            <tr><th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FLETE</th><th>ESTADO</th><th>ACCION</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>
    `);
  } catch (err) {
    res.status(500).send("ERROR TÉCNICO: " + err.message);
  }
});

// 5. RUTA EDITAR
app.get('/editar/:id', async (req, res) => {
  const f = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#111; color:#eee; font-family:sans-serif; padding:40px;">
      <h2>Editar Servicio #${req.params.id}</h2>
      <form action="/guardar/${req.params.id}" method="POST">
        Valor Flete: <br>
        <input type="number" name="v_flete" value="${f[0].v_flete}" style="padding:10px; margin:10px 0;"><br>
        Estado: <br>
        <select name="est_pago" style="padding:10px; margin:10px 0;">
          <option ${f[0].est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
          <option ${f[0].est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
        </select><br>
        <button type="submit" style="padding:10px 20px; background:#3b82f6; color:white; border:none;">GUARDAR</button>
      </form>
    </body>
  `);
});

app.post('/guardar/:id', async (req, res) => {
  await Finanza.update(req.body, { where: { cargaId: req.params.id } });
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => {
  app.listen(PORT, () => console.log('Servidor en puerto ' + PORT));
});
