import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'SQL formatter',
  lede: 'Format SQL queries with each clause on its own line, consistent indentation and the keyword case you prefer. Choose your database’s dialect (PostgreSQL, MySQL, SQL Server, SQLite, Oracle and others) so its syntax is understood.',
  steps: [
    { title: 'Paste a query', body: 'One statement or several separated by semicolons, such as a query copied from a log or an ORM.' },
    { title: 'Pick dialect and keyword case', body: 'Standard SQL covers common queries. Keywords can be UPPER, lower or left as written.' },
    { title: 'Copy the query', body: 'Each statement is formatted, with a blank line between statements, ready for a .sql file or a code review.' },
  ],
  faq: [
    { q: 'Which dialect should I choose?', a: 'The one your database uses. Standard SQL handles everyday SELECT, INSERT, UPDATE and DELETE, but features such as PostgreSQL’s :: casts and ON CONFLICT, or SQL Server’s [bracketed] names, are only recognized with their dialect selected.' },
    { q: 'Does it check that my query is valid?', a: 'No. It follows keywords, brackets and commas to lay the query out; it doesn’t know your tables or columns. It reports an error only when it can’t follow the structure, such as an unclosed bracket. A misspelled keyword passes through unchanged.' },
    { q: 'Does keyword case change my names or strings?', a: 'No. Only keywords and data types change case. Table and column names, function names, quoted identifiers and string values stay exactly as written.' },
    { q: 'Which formatter is used?', a: 'The open-source sql-formatter library, running in this page. Your queries are never sent anywhere.' },
  ],
  example: {
    intro: 'A reporting query on one line, formatted as standard SQL with upper-case keywords.',
    inputLabel: 'sql',
    input: "select c.name,sum(o.total) as revenue from customers c join orders o on o.customer_id=c.id where o.status='paid' group by c.name order by revenue desc",
    outputLabel: 'formatted',
    output:
      "SELECT\n  c.name,\n  sum(o.total) AS revenue\nFROM\n  customers c\n  JOIN orders o ON o.customer_id = c.id\nWHERE\n  o.status = 'paid'\nGROUP BY\n  c.name\nORDER BY\n  revenue DESC\n",
  },
  mistakes: [
    { title: 'Using the wrong dialect', body: 'If a valid query is rejected or comes out oddly split, choose your database in the dialect list. Placeholders such as $1, ? and :name also depend on it.' },
    { title: 'Treating formatting as validation', body: 'A neatly formatted query can still reference a missing column. Run it against your database to be sure.' },
    { title: 'Pasting a query still wrapped in code', body: '"SELECT * " + "FROM users" is a string in your program, not SQL. Remove the quotes and the + signs first.' },
    { title: 'Changing the case of quoted names', body: 'In PostgreSQL "UserId" and userid are different names. The formatter never touches quoted names; don’t retype them in another case by hand.' },
  ],
  related: ['code-beautifier', 'list-to-sql', 'json-formatter', 'python-formatter'],
};

export default content;
