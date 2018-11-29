# @rich_harris/sql

Opinionated wrapper around [mysql2](https://github.com/sidorares/node-mysql2).

## Installation

Install both `@rich_harris/sql` and `mysql2` (which is a peer dependency, not included):

```bash
npm i @rich_harris/sql mysql2
```

## Usage

```js
import { connect } from '@rich_harris/sql';

async function main() {
  const db = await connect({
    connectionLimit: 100, // number of simultaneous pooled connections
    host: 'localhost',
    user: 'root',
    database: 'my-database'
  });

  await db`
    CREATE TABLE IF NOT EXISTS people (
      id MEDIUMINT NOT NULL AUTO_INCREMENT,
      first_name VARCHAR(30),
      last_name VARCHAR(30),
      email VARCHAR(80),
      dob DATE,
      PRIMARY KEY (id)
    );
  `;

  // fake data via mockaroo.com
  const person = {
    first_name: 'Llewellyn',
    last_name: 'Satcher',
    email: 'lsatcher1@nhs.uk',
    dob: new Date(1982, 7, 15)
  };

  await db`
    INSERT INTO people (first_name, last_name, email, dob) VALUES(
      ${person.first_name},
      ${person.last_name},
      ${person.email},
      ${person.dob}
    );
  `;

  const { rows } = await db`
    SELECT first_name, last_name FROM people WHERE email=${person.email}
  `;

  console.log(rows);

  await db.close();
}
```

Any `${values}` are automatically escaped etc. Every time you run a query, it will get or create a pooled connection, and release it once the query is complete.

As well as executing arbitrary queries, there is a convenience method for inserting data:

```js
const table = await db.table('people');

const people = [{
  first_name: "Rodolphe",
  last_name: "McAlinden",
  email: "rmcalinden4@printfriendly.com",
  dob: "7/27/2017"
}, {
  first_name: "Laural",
  last_name: "Lebell",
  email: "llebell5@marketwatch.com",
  dob: "9/4/2017"
}, {
  first_name: "Binny",
  last_name: "MacFarlane",
  email: "bmacfarlane6@cnet.com",
  dob: "1/3/2018"
}, {
  first_name: "Adams",
  last_name: "Keeble",
  email: "akeeble7@arstechnica.com",
  dob: "2/5/2018"
}, {
  first_name: "Dill",
  last_name: "Everest",
  email: "deverest8@t-online.de",
  dob: "7/25/2017"
}]

await table.insert(people[0]); // insert a single row
await table.insert(people); // insert many rows
```

## License

[LIL](LICENSE)
