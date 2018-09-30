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
    this._db = db
    this.id = id
    this.model = model,
    this.data = Object.assign({}, data)
  }

  /**
   * Creates the dynamic schema from Model properties
   * @return {Object} Well formatted schema
   */
  static createSchema () {
    if (typeof this.schema !== 'function') throw new Error('Missing schema')
    if (this.name.match('Model$') === null) throw new Error('Model naming mismatch')
    
    // Get the Model Name
    let name = this.name.slice(0, -5)
    
    // Create a models object to store in the database
    let obj = {
      foreign_keys: {},
      schema: this.schema(),
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
   * Deep associate Models
   * @param  {string} name      Name of Model
   * @return {LinesDbModel}     This
   */
  with (name) {
    let key = name + 'Id'
    if (!this._schema) throw new Error('No Schema declared for Model ' + this.className)
    if (!this._schema.hasOwnProperty('foreign_keys') ||
      this._schema.foreign_keys[key] === undefined) throw new Error('Model \'' + this.className + '\' does not have a FK ' + key)

    // get FK model
    let model = this._schema.foreign_keys[key]
    
    if (!this.data.hasOwnProperty(key)) {
      throw new Error(this.model + " does not have a '" + model + "' ")
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
    if (typeof model.schema !== 'function') throw new Error('Missing schema')
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