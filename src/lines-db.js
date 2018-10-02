/****************************************************************

ISC License

Copyright (c) 2018, Morten Ege Jensen <ege.morten@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

******************************************************************/

/**
 * Global facade for dependency injection
 */
class LinesDbFacade {

  static set db (db) {
    this.constructor._db = db
  }

  static get db () {
    return this.constructor._db
  }

  static find (model, id) {
    return this.constructor._db.find(model, id)
  }

  static where (model, key, value, operator = '=') {
    return this.constructor._db.where(model, key, value, operator)
  }

  static insert (model, data) {
    return this.constructor._db.insert(model, data)
  }

  static update (model, id, data) {
    return this.constructor._db.update(model, id, data)
  }

  static delete (model, id) {
    return this.constructor._db.delete(model, id) 
  }
}

/**
 * Collection
 */
class LinesDbCollection {

  /**
   * Create Collection from Array
   * @param  {Array} arr    Array of Models
   */
  constructor (arr) {
    this._arr = arr.slice()
  }

  /**
   * Find within collection - model is already known
   * @param  {Integer} id   Id of Modal to find
   * @return {LinesDbModel}    Found model or null
   */
  find (id) {
    for (let i in this._arr) {
      let m = this._arr[i]
      if (m.id == id) {
        return m
      }
    }
    return null
  } 

  /**
   * Filter within the Collection - Model is already known
   * @param  {String} key      Which Model attribute to search
   * @param  {Mixed}  value    Value to compare with
   * @param  {String} operator An operator for the operation
   * @return {LinesDbCollection}          A filtered collection
   */
  where (key, value, operator = '=') {
    let arr = []
    for (let i in this._arr) {
      let m = this._arr[i]
      // if (model !== m.modelName) continue
      if (LinesDb.operators(operator, m[key], value)) {
        arr.push(m)
      }
    }
    this._arr = arr.slice()
    return this
  }

  /**
   * Get the first element of a collection
   * @return {LinesDbModel} The first element of Null
   */
  first () {
    if (this._arr.length === 0) return null
    return this._arr[0]
  }
}

/**
 * Base Class for Models
 */
class LinesDbModel {

  /**
   * Creates the Model with reference to the database
   * @param  {LinesDb} db     reference to the database
   * @param  {string} model   Model name
   * @param  {Integer} id     Model Id
   * @param  {Object} data    Data for model as with key:value pairs
   */
  constructor (db, model, id, data) {
    this._db = db || LinesDbFacade.db
    this._model = model || this.modelName,
    this._id = id || null
    this.data = Object.assign({}, data)

    // Create getters and setters for all params in schema
    // TODO: Add type checks and casting to types
    for (let param in this.constructor.schema) {
      let getterName = 'get' + param.charAt(0).toUpperCase() + param.slice(1);
      let setterName = 'set' + param.charAt(0).toUpperCase() + param.slice(1);
      this[getterName] = () => { return this.data[param] }
      this[setterName] = (x) => { this.data[param] = x}
    }
  }

  get id () {
    return parseInt(this._id)
  }

  set id (x) {
    throw new Error('Attribute Id is immutable')
  }

  /**
   * Creates the dynamic schema from Model properties
   * @return {Object} Well formatted schema
   */
  static createSchema () {
    if (typeof this.schema !== 'object') throw new Error('Missing schema')
    if (this.name.match('Model$') === null) throw new Error('Model naming mismatch')
    
    // Get the Model Name
    let name = this.name.slice(0, -5)
    
    // Create a standard/base schema
    // TODO: Refactor to own class
    let newSchema = {}
    for (let param in this.schema) {
      let declaration
      if (typeof this.schema[param] === 'string') {
        declaration = {
          type: this.schema[param]
        }
      } else {
        declaration = this.schema[param]
      }

      if (declaration.type === undefined) throw new Error('Missing \'type\' field for \'' + param + '\'')

      let baseDeclaration = {
        required: false,
        default: LinesDb.schemaDefaultValue(declaration.type)
      }

      declaration = Object.assign(baseDeclaration, declaration)
      newSchema[param] = declaration
    }

    // Create a models object to store in the database
    let obj = {
      foreign_keys: {},
      schema: newSchema,
      class: this
    }

    // TODO: add formats (cast) to output
    Object.keys(obj.schema).forEach((key, index) => {
      if (typeof obj.schema[key] === 'string') return
      if (typeof obj.schema[key] === 'object') {
        if (obj.schema[key].type === 'fk') {
          if (typeof obj.schema[key].model !== 'string') throw new Error('FK Type mismatch')
          obj['foreign_keys'][key] = obj.schema[key].model
        }
      }
    })

    return obj
  }

  /**
   * Get the model name from class
   * @return {string} Model Name
   */
  get modelName () {
    return this.constructor.name.slice(0, -5)
  }

  static get modelName () {
    return this.name.slice(0, -5) 
  }

  /**
   * Get the Schema referenced in the database
   * @return {Object} Schema
   */
  get _schema () {
    return this._db._models[this.modelName]
  }

  /**
   * Abstract method
   */
  static get schema () {
    return {}
  }

  /**
   * Deep associate Models
   * @param  {string} name      Name of Model
   * @return {LinesDbModel}     This
   */
  with (name) {
    let key = name + 'Id'
    if (!this._schema) throw new Error('No Schema declared for Model ' + this.modelName)
    if (!this._schema.hasOwnProperty('foreign_keys') ||
      this._schema.foreign_keys[key] === undefined) throw new Error('Model \'' + this.modelName + '\' does not have a FK ' + key)

    // get FK model
    let model = this._schema.foreign_keys[key]
    
    if (!this.data.hasOwnProperty(key)) {
      throw new Error(this.modelName + " does not have a '" + model + "' ")
    }

    let modelId = this.data[key]
    let obj = this._db.find(model, modelId)
    this.data[name] = obj
    
    return this
  }

  /**
   * Find Model of this type by Id
   * @param  {Integer} id   Model Id
   * @return {LinesDbModel}    Found Model or null
   */
  static find (id) {
    return LinesDbFacade.find(this.modelName, id)
  }

  /**
   * Find Models of this type 
   * @param  {String} key      Model Attribute
   * @param  {Mixed}  value    Attribute value to compare
   * @param  {String} operator operator for operation
   * @return {LinesDbCollection}          Array of found models
   */
  static where (key, value, operator = '=') {
    return LinesDbFacade.where(this.modelName, key, value, operator)
  }

  static create (data) {
    return LinesDbFacade.insert(this.modelName, data)
  }

  put () {
    let newObj
    if (this.id === null) {
      newObj = LinesDbFacade.insert(this.modelName, this.data)
    } else {
      newObj = LinesDbFacade.update(this.modelName, this.id, this.data)
    }

    this.data = Object.assign({}, newObj.data)
    this._id = newObj.id
    return this
  }

  remove () {
    return LinesDbFacade.delete(this.modelName, this.id)
  }

  /**
   * Override toString method
   * @return {String}
   */
  toString(){
    let copy = Object.assign({}, this)
    delete(copy._db)
    return JSON.stringify(copy);
  }
}

/**
 * Main Database class
 */
class LinesDb {

  /**
   * TODO: Add load database from file
   * Create a database from array or empty
   * @param  {string|array} database Array of properly formatted data
   */
  constructor (database) {
    this._models = {}
    this._data = {}

    if (Array.isArray(database)) {
      this.createDatabaseFromArray(database)
    }

    // Inject global dependency
    LinesDbFacade.db = this
  }

  /**
   * Operator string to function 'transpiler'
   * @param  {String} op  Operator
   * @param  {Mixed} x    Operator compare value 1
   * @param  {Mixed} y    Operator compare value 2
   * @return {Boolean}    Result of compare
   */
  static operators (op, x, y) {
    if (typeof op !== 'string') throw new Error('Operator type mismatch')

    op = op.toLowerCase()

    switch (op) {
      case '=':
        return x == y
      case '!=':
        return x != y
      case '>':
        return x > y
      case '<':
        return x < y
      case '>=':
        return x >= y
      case '<=':
        return x <= y
      case 'in':
        if (!Array.isArray(y)) throw new Error('Type mismatch for IN operator')
        return y.indexOf(x) >= 0
      case 'match':
        if (typeof x !== 'string') throw new Error('Expected string, got ' + typeof x)
        if (typeof y !== 'string') throw new Error('Expected string, got ' + typeof y)
        return y.match(x) !== null
      default:
        throw new Error('Unknown operator \'' + op + '\'')
    }
  }

  /**
   * Associate a Model Schema with the database
   * @param {LinesDbModel} model A class that inherits LinesDbModel
   */
  addModel (model) {
    // Verify model is a proper class
    if (typeof model !== 'function') throw new Error('Type mismatch')
    if (!(model.prototype instanceof LinesDbModel)) throw new Error('Class mismatch')
    if (typeof model.schema !== 'object') throw new Error('Missing schema')
    if (model.name.match('Model$') === null) throw new Error('Model naming mismatch')
    
    // Get the Model Name
    let name = model.name.slice(0, -5)

    // Create the schema
    let obj = model.createSchema()
    this._models[name] = obj
    
    return this
  } 

  /**
   * First query function: get by Id
   * @param  {string} model model to query in db
   * @param  {integer} id    model Id
   * @return {LinesDbModel}       model if found, else null
   */
  find (model, id) {
    if (!this._data.hasOwnProperty(model)) return null
    if (!this._data[model].hasOwnProperty(id)) return null
    
    if (!this._models.hasOwnProperty(model)) {
      return new LinesDbModel(this, model, id, this._data[model][id])
    }
    return new this._models[model].class(this, model, id, this._data[model][id])
  }

  /**
   * Find models of this type
   * $param  {String} model    Which model to search for
   * @param  {String} key      Which Model attribute to search
   * @param  {Mixed}  value    Value to compare with
   * @param  {String} operator An operator for the operation
   * @return {LinesDbCollection}          A filtered collection
   */
  where (model, key, value, operator = '=') {
    if (!this._data.hasOwnProperty(model)) return null
    let arr = []
    for (let id in this._data[model]) {
      let m = this._data[model][id]
      let v = m[key]
      if (this.constructor.operators(operator, v, value)) {
        arr.push(this.find(model, id))
        //arr.push(Object.assign({id: id, model: model}, m))
      }
    }
    return new LinesDbCollection(arr)
  }

  static schemaDefaultValue (declaration) {
    let t
    
    // Check declaration
    if (typeof declaration === 'string') {
      t = declaration
    } else if (typeof declaration === 'object') {
      if (typeof declaration.type !== 'string') throw new Error('Type mismatch for \'type\'. Expected string, got ' + typeof declaration.type)
      t = declaration.type        
    } else {
      throw new Error('Type mismatch for declaration. Expected string or object, got ' + typeof declaration)
    }

    t = t.toLowerCase()

    switch (t) {
      case 'string':
        return ''
      case 'integer':
      case 'fk':
        return 0
      case 'float':
        return 0.0
      default:
        return 0
    }
  }

  /**
   * Insert data into database
   * @param  {string} model     Model to insert data for
   * @param  {Object} data      Key/value pairs of data to insert
   * @return {LinesDbModel}     Inserted model or null
   */
  insert (model, data) {
    if (!this._data.hasOwnProperty(model)) {
      this._data[model] = {}
    }

    if (data.id !== undefined) throw new Error('Model Id is immutable')

    // get new Id
    let ids = Object.keys(this._data[model])
    let max = ids.length === 0 ? 0 : Math.max(...ids)
    let newId = max + 1

    // Create new data structure
    let insertData = {model: model, id: newId}
    
    // Reference the Model schema
    if (this._models[model] !== undefined) {
      let schema = this._models[model].schema
      // loop through schema and check each param  
      for (let param in schema) {
        
        // 1. Check if param is required and not present
        if (schema[param].required && data[param] === undefined) throw new Error('Parameter \'' + param + '\' is required for model ' + model)
        
        // 2. Check if param is present, otherwise add default value
        if (data[param] === undefined) {
          insertData[param] = schema[param].default
          continue
        }

        // TODO: 3. add check for type
        
        // Add param and data
        insertData[param] = data[param]
      }
    } else {
      insertData = Object.assign(insertData, data)
    }
    
    // insert data
    this._data[model][newId] = insertData
    
    // return instance of new Model
    return this.find(model, newId)
  }

  /**
   * Update data in database
   * @param  {string}   model   Model name
   * @param  {Integer}  id      Model Id
   * @param  {Object}   data    Key/value pairs of data to update
   * @return {LinesDbModel}     Updated model
   */
  update (model, id, data) {
    var obj = this.find(model, id)
    if (obj === null)
      throw new Error('Model ' + model + ' with Id ' + id + ' does not exist')
    
    let insertData = obj.data
    
    // Reference the Model schema
    if (this._models[model] !== undefined) {
      let schema = this._models[model].schema
      // loop through data and ensure it matches Schema
      for (let param in data) {
        // 1. check it exists in schema
        if (schema[param] === undefined) continue
        
        // 2. Check if param is required and empty
        if (schema[param].required && (data[param] === '' || data[param] === null)) 
          throw new Error('Parameter \'' + param + '\' is required for model ' + model)

        // TODO: 3. add check for type
        
        // Add param and data
        insertData[param] = data[param]
      }
    } else {
      insertData = Object.assign(insertData, data)
    }

    // Update record
    this._data[model][id] = Object.assign({}, insertData)

    return this.find(model, id)
  }

  /**
   * Delete line in database
   * @param  {String}  model  Model name
   * @param  {Integer} id     Model id
   * @return {bool}           True only
   */
  delete (model, id) {
    let obj = this.find(model, id)
    if (obj === null)
      throw new Error('Model ' + model + ' with Id ' + id + ' does not exist')

    delete(this._data[model][id])

    return true
  }

  /**
   * Create a database from array
   * @param  {Array} arr Properly formatted data
   */
  createDatabaseFromArray (arr) {
    arr.forEach((obj, index) => {
      if (!obj.hasOwnProperty('model') || !obj.hasOwnProperty('id')) {
        throw new Error("Missing attribute 'model' or 'id' in " + JSON.stringify(obj) + " at " + index)
      }

      if (typeof obj.model !== 'string') {
        throw new Error("Type mismatch for attribute 'model'") 
      }

      if (typeof obj.id === 'string' && obj.id.match('^[0-9]+$') === null ||
        typeof obj.id === 'number' && !Number.isInteger(obj.id)) {
        throw new Error("Type mismatch for attribute 'id'")  
      }

      if (!this._data.hasOwnProperty(obj.model)) {
        this._data[obj.model] = {}
      }

      // Clone and keep a clean db
      let newObj = Object.assign({}, obj)
      delete(newObj.id)
      delete(newObj.model)

      // store
      this._data[obj.model][obj.id] = newObj
    })

  }
}

module.exports = {
  LinesDb,
  LinesDbModel,
  LinesDbCollection,
  LinesDbFacade
}