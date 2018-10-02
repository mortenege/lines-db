// Import Lines
const { LinesDb, LinesDbModel } = require('./src/lines-db.js')

/**
 * Model: Project
 */
class ProjectModel extends LinesDbModel {
  static get schema () {
    return {
      title: 'string',
    }
  }
}

/**
 * Model: TimeEvent
 */
class TimeEventModel extends LinesDbModel {
  static get schema () {
    return {
      projectId: {type: 'fk', model: 'Project', 'required': true},
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

// Perform a simple query - with nesting
let o1 = db.find('TimeEvent', 3).with('project')
// Returns new TimeEventModel from database

// Perform a query directly on the Model
let o2 = TimeEventModel.find(3).with('project')
// Returns new TimeEventModel from database

// Perform a query to return a collection
let coll = db.where('TimeEvent', 'projectId', 3)
// Returns new LinesDbCollection with multiple TimeEventModels

// Perform a query on the collection (mutating collection)
coll.where('id', 7, '<=')
// mutates the collection

// Perform find on collection (non-mutating operation)
let o3 = coll.find(3)
// Returns Model from collection

// get the first Model of collection (non-mutating operation)
let o4 = coll.first()
// Returns Model from collection


// Create a new record
var o4 = db.insert('Project', {title: 'you wish', other: 'non-schema param'})
// Returns new ProjectModel with new Id

// Create and update a record
var o5 = db.insert('TimeEvent', {projectId: o4.id})
var o6 = db.update(TimeEventModel.modelName, o5.id, {description: 'Snail mate', projectId: 2})

// delete a record
var deleted = db.delete(TimeEventModel.modelName, 2)
// returns true when deleted
var o7 = db.find(TimeEventModel.modelName, 2)
// returns null after deletion

// Create a new Record using Model
var o8 = ProjectModel.create({title: 'Hallooo'})
// Mutate Model
o8.setTitle('jajaj')
// Update Model
o8.put()

// Create a new Record using different approach
var o9 = new ProjectModel()
o9.setTitle('Massov')
o9.put()