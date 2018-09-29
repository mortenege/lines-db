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
    this.data = data
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
    console.log('LinesDb:constructor', typeof database)
    this._models = {}
    this._data = {}

    if (Array.isArray(database)) {
      this.createDatabaseFromArray(database)
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

/***************************************************
 *
 * TEST CODE
 *
 ***************************************************/

/**
 * Model: Project
 */
class ProjectModel extends LinesDbModel {
  static schema () {
    return {
      title: 'string',
    }
  }
}

/**
 * Model:: TimeEvent
 */
class TimeEventModel extends LinesDbModel {
  static schema () {
    return {
      projectId: {type: 'fk', model: 'Project'},
      description: 'string',
    }
  }
}

/**
 * Mock Database
 * @type {Array}
 */
let obj = [
  {model: 'Project', id: 1, title: 'Project Aha'},
  {model: 'Project', id: 2, title: 'Project bac'},
  {model: 'Project', id: 3, title: 'Project omm'},
  {model: 'Project', id: 4, title: 'Project sup'},
  {model: 'TimeEvent', id: 1, projectId: 1, description: 'Working a'},
  {model: 'TimeEvent', id: 2, projectId: 1, description: 'Working b'},
  {model: 'TimeEvent', id: 3, projectId: 2, description: 'Working c'},
  {model: 'TimeEvent', id: 4, projectId: 2, description: 'Working d'},
  {model: 'TimeEvent', id: 5, projectId: 2, description: 'Working e'},
  {model: 'TimeEvent', id: 6, projectId: 3, description: 'Working f'},
  {model: 'TimeEvent', id: 7, projectId: 3, description: 'Working g'},
  {model: 'TimeEvent', id: 8, projectId: 4, description: 'Working h'}
]

// Initialize the database
let db = new LinesDb(obj)
// Associate models with the database
db.addModel(ProjectModel)
db.addModel(TimeEventModel)
// Perform a simple query
console.log(db.find('TimeEvent', 3).with('project'))