# Lines: An In-Memory JavaScript Database

> A more detailed description will follow

An attempt to create an in-memory database to simplify desktop and native apps.

> **Disclaimer** This project will have code, use- and test cases for what is explicitly needed for other projects at the time of writing.

## Features

Some features of this database

 * Load a database from a single file or keep it entirely in memory.
 * Strict Schematics Option to ensure structure in database
    * `type` attribute 
    * `required` attribute
    * `default value` attribute
 * Object Relational Mappers (ORM) and Query Abstraction to not meddle with the data directly.
    * Dynamic getters/setters for each attribute added in Schema
 * General CRUD operations for single model or collection of models
 * Associating Models and querying associated models
 * Persist data in a single file or stream
 * *Coming* Casting all model data to specific types (depending on Schema)

## How to use

> See `example.js` for more examples

Require LinesDB and any classes you may need

```javascript
var {LinesDb, LinesDbModel, LinesDbCollection, LinesDbFacade} = require('lines-db')
```

Create a new empty database, load from array or file

```javascript
var db = LinesDb(null|file|array)
```

This will also initialize the `LinesDbFacade` with a reference to the current database object

Create a Model and associate it with the Database. **(Follow the naming convention!)**

```javascript
class PersonModel extends LinesDbModel {
  // Required
  static get schema () {
    return {
      name: {type: 'string', required: false, default: ''}, // object style
      age: 'integer' // Simple style
    }
  }
}

class PetModel extends LinesDbModel {
  // Required
  static get schema () {
    return {
      ownerId: {type: 'fk', model: 'Person', required: true},
      name: 'string'
      type: 'string'
    }
  }
}

db.addModel(PersonModel)
db.addModel(PetModel)
```

Create, update and delete records in database

```javascript
var p1 = new PersonModel()
p1.setName('John')
p1.setAge(23)
p1.put()

var d1 = new PetModel()
d1.setOwnerId(p1.id)
d1.setType('dog')
d1.setName('Pluto')
d1.put()

d1.remove()
```

Query database

```javascript
// Get Person with Id = 3
var p2 = PersonModel.find(3)

// Get a collection of people older than 17
var people = PersonModel.where('age', 17, '>')

// further query the collection (mutating operation)
people.where('name', ['John', 'Jack'], 'in')

// non-mutating collection operations
var p3 = people.find(3)
var p4 = people.first()
```

## Installation & Test

For production there are no dependencies and is therefore a single-file library

```
$ git clone https://github.com/mortenege/lines-db.git
$ npm install
$ npm test
```


