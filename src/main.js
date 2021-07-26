const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database(
	"/home/jcuenod/Programming/pdfindex/create-pdf-index/index.sqlite"
)

// LIMIT -1 OFFSET 0 is because of subquery flattening
// cf. https://www.mail-archive.com/sqlite-users@mailinglists.sqlite.org/msg115821.html
const stmt = db.prepare(`
SELECT 
  name,
  group_concat(page, ', ') as pages,
  group_concat(extract, '___SEPARATOR___') as extracts
FROM (
  SELECT
    metadata.rowid as rowid,
    name,
    page,
    snippet(pages, 2, '<b>', '</b>', '', 15) as extract
  FROM
    pages,
    metadata
  WHERE
    content MATCH ?
  AND
    pages.id = metadata.rowid
  LIMIT -1 OFFSET 0) fts
GROUP BY rowid
ORDER BY name
LIMIT 100;
`)
const queryToParam = query =>
	`${query
		.split(" ")
		.map(term => `"${term}"`)
		.join(" ")}`
const find = query =>
	new Promise((resolve, reject) => {
		const p = queryToParam(query)
		console.log(p)
		stmt.all(p, (err, rows) => {
			if (err) {
				reject(err)
			}
			resolve(rows)
		})
	})

const express = require("express")
const app = express()

app.get("/query", async function (req, res) {
	const query = req.query.q
	console.log(query)
	const results = await find(query)
	res.send(results)
})

app.listen(3000)
