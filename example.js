// Import Lines
const { LinesDb, LinesDbModel } = require('./src/lines-db.js')

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
 * Model: TimeEvent
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

// Perform a simple query - with nesting
let o1 = db.find('TimeEvent', 3).with('project')

// Perform a query directly on the Model
let o2 = TimeEventModel.find(3).with('project')

// Perform a query to return a collection
let coll = db.where('TimeEvent', 'projectId', 3)

// Perform a query on the collection (mutating collection)
coll.where('id', 7, '<=')

// Perform find on collection (non-mutating operation)
let o3 = coll.find(6)

console.log(o3)