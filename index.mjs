import mysql from 'mysql2/promise';

export async function connect(options) {
	const pool = mysql.createPool(Object.assign({
		connectionLimit: 10
	}, options));

	async function run(sql, values) {
		const conn = await pool.getConnection();
		const [rows, fields] = await conn.execute(sql, values);
		await conn.release();
		return { rows, fields };
	}

	const db = async function query(strings, ...values) {
		return run(strings.join('?'), values);
	};

	db.query = db;

	db.run = run;

	db.table = async name => {
		const conn = await pool.getConnection();
		const [rows] = await conn.execute(`DESCRIBE ${name}`);

		const primary_key_fields = rows
			.filter(row => row.Key === 'PRI')
			.map(row => row.Field);

		const field_names = rows.map(row => row.Field);
		const row_str = `(${Array(field_names.length).fill('?').join(',')})`;

		const table = {
			insert: async (data, { replace, ignore } = {}) => {
				if (!data) return;
				if (!Array.isArray(data)) data = [data];
				if (data.length === 0) return;

				const values = [];
				data.forEach(row => {
					field_names.forEach(field => {
						values.push(field in row ? row[field] : null);
					});
				});

				const conn = await pool.getConnection();
				const [rows, fields] = await conn.execute(`
					${replace ? 'REPLACE' : 'INSERT'} ${ignore ? 'IGNORE' : ''} INTO ${name} (${field_names.join(',')}) VALUES ${
						Array(data.length).fill(row_str).join(',')
					};
				`, values);
				await conn.release();
				return { rows, fields };
			},

			update: async (row, filter) => {
				if (!filter) {
					if (primary_key_fields.length === 0) {
						throw new Error(`No filter provided`);
					}

					filter = {};
					primary_key_fields.forEach(field => {
						filter[field] = row[field];
					});
				}

				const changes = [];
				const values = [];
				field_names.forEach(field => {
					if (field in row) {
						changes.push(`${field} = ?`);
						values.push(row[field]);
					}
				});

				const conditions = [];
				Object.keys(filter).forEach(field => {
					conditions.push(`${field} = `);
					values.push(filter[field]);
				});

				const conn = await pool.getConnection();
				const [rows, fields] = await conn.execute(`
					UPDATE ${name}
					SET ${changes.join(', ')}
					WHERE ${conditions.join(' AND ')}
				`, values);

				await conn.release();
				return { rows, fields };
			},

			sanitize: data => {
				if (!data) return;
				if (!Array.isArray(data)) data = [data];
				if (data.length === 0) return;

				const warnings = [];

				data.forEach((datum, i) => {
					rows.forEach(row => {
						const field = row.Field;

						if (field in datum && datum[field] === undefined) {
							warnings.push({
								row: i,
								field,
								message: `was undefined`
							});

							datum[field] = null;
						}

						if (row.Type.startsWith('varchar')) {
							const length = +row.Type.slice(8, -1);

							if (datum[field] && datum[field].length > length) {
								warnings.push({
									row: i,
									field,
									message: `exceeded length (${datum[field].length} > ${length})`
								});

								datum[field] = datum[field].slice(0, length);
							}
						}
					});
				});

				return warnings;
			}
		};

		return table;
	};

	db.close = () => pool.end();

	return db;
}