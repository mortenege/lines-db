var expect = require('chai').expect;
var {LinesDb, LinesDbModel, LinesDbCollection, LinesDbFacade} = require('../src/lines-db.js');

var data = [
  {model: 'Person', id: 1, name: 'John', age: 32},
  {model: 'Person', id: 2, name: 'jack', age: 16},
  {model: 'Person', id: 3, name: 'Jane', age: 54},
  {model: 'Pet', id: 1, ownerId: 1, type: 'dog', name: 'Pluto'},
  {model: 'Pet', id: 2, ownerId: 1, type: 'dog', name: 'Bingo'},
  {model: 'Pet', id: 3, ownerId: 2, type: 'cat', name: 'Ginger'},
  {model: 'Pet', id: 4, ownerId: 2, type: 'dog', name: 'Rex'},
  {model: 'Pet', id: 5, ownerId: 2, type: 'fish', name: 'Nemo'},
  {model: 'Pet', id: 6, ownerId: 3, type: 'dog', name: 'Pluto'},
]

class PersonModel extends LinesDbModel {
  static get schema () {
    return {
      name: 'string',
      age: 'integer'
    }
  }
}

class PetModel extends LinesDbModel {
  static get schema () {
    return {
      ownerId: {type: 'fk', model: PersonModel.modelName},
      type: 'string',
      name: 'integer'
    }
  }
}

describe('LinesDb.constructor()', function () {
  it('should init', function () {
    
    // 1. ARRANGE

    // 2. ACT
    var db = new LinesDb();

    // 3. ASSERT
    expect(db._data).to.be.empty;

  });

  it('should init from Array', function () {
    
    // 1. ARRANGE

    // 2. ACT
    var db = new LinesDb(data);

    // 3. ASSERT
    expect(db._data.Person).to.not.be.undefined
    expect(db._data.Pet).to.not.be.undefined

    expect(db._data.Person).to.not.be.undefined

  });
});

describe('LinesDb.operators()', function () {
  it('should throw on operator type mismatch', function () {
    
    // 1. ARRANGE
    var x = undefined
    var y = undefined
    var op = [] // something, not a string

    // 2. ACT
    var badFn = LinesDb.operators.bind(null, op, x, y)
    // 3. ASSERT
    expect(badFn).to.throw(Error)

  });

  it('should handle simple operation', function () {
    
    // 1. ARRANGE
    var x = 5
    var y = 2
    var op = '>'
    var expectedResult = true

    // 2. ACT
    var result = LinesDb.operators(op, x, y)

    // 3. ASSERT
    expect(result).to.equal(expectedResult);

  });

  it('should handle IN operation', function () {
    
    // 1. ARRANGE
    var x = 5
    var y = [1, 3, 2, 5, 6, 7]
    var op = 'in'
    var expectedResult = true

    // 2. ACT
    var result = LinesDb.operators(op, x, y)

    // 3. ASSERT
    expect(result).to.equal(expectedResult);

  });

  it('should throw using IN when second argument is not array', function () {
    
    // 1. ARRANGE
    var x = 5
    var y = 'something'
    var op = 'in'

    // 2. ACT
    var badFn = LinesDb.operators.bind(null, op, x, y)

    // 3. ASSERT
    expect(badFn).to.throw(Error)

  });

  it('should handle MATCH operation', function () {
    
    // 1. ARRANGE
    var x = 'Jens.n'  // regex
    var y = 'The name is Jensen, Morten Jensen'
    var op = 'match'
    var expectedResult = true

    // 2. ACT
    var result = LinesDb.operators(op, x, y)

    // 3. ASSERT
    expect(result).to.equal(expectedResult);

  });

  it('should throw using MATCH when arguments are not strings', function () {
    
    // 1. ARRANGE
    var str = 'stri'
    var notStr = []
    var op = 'match'

    // 2. ACT
    var badFn1 = LinesDb.operators.bind(null, op, str, notStr)
    var badFn2 = LinesDb.operators.bind(null, op, notStr, str)

    // 3. ASSERT
    expect(badFn1).to.throw(Error)
    expect(badFn2).to.throw(Error)

  });
});

describe('LinesDb.find()', function () {
  it('should find a Model in database by id', function () {
    
    // 1. ARRANGE
    var modelName = 'Person'
    var id = 1

    // 2. ACT
    var db = new LinesDb(data);
    var obj = db.find(modelName, 1)

    // 3. ASSERT
    expect(obj).to.not.be.null;
    expect(obj).to.be.an.instanceof(LinesDbModel);

  });

  it('should not return a reference to the global data object', function () {
    
    // 1. ARRANGE
    var modelName = 'Person'
    var id = 1

    // 2. ACT
    var db = new LinesDb(data);
    var obj1 = db.find(modelName, 1)
    var obj2 = db.find(modelName, 1)

    // 3. ASSERT
    expect(obj2).to.not.equal(obj1);

    // Ensure
    obj1.name = 'James'
    expect(obj2.name).to.not.equal(obj1.name);

  });
});

describe('LinesDb.where()', function () {
  it('should filter the database by key value operation', function () {
    
    // 1. ARRANGE
    var modelName = 'Pet'
    var key = 'type'
    var value = 'dog'
    var operator = '='
    var expectedResultsLength = 4

    // 2. ACT
    var db = new LinesDb(data);
    var collection = db.where(modelName, key, value, operator)

    // 3. ASSERT
    expect(collection).to.be.an.instanceof(LinesDbCollection)
    expect(collection._arr).to.not.be.empty;
    expect(collection._arr.length).to.equal(expectedResultsLength);
    expect(collection._arr[0]).to.be.instanceOf(LinesDbModel)

  });
});

describe('LinesDb.addModel()', function () {
  it('should add model to internal reference', function () {
    
    // 1. ARRANGE
    // Use global Models

    // 2. ACT
    var db = new LinesDb()
    db.addModel(PersonModel)

    // 3. ASSERT
    expect(db._models).to.not.be.empty

  });

  it('should add model FK to internal reference', function () {
    
    // 1. ARRANGE
    // Use global Models
    var fk = 'ownerId'
    var fkValue = 'Person' 

    // 2. ACT
    var db = new LinesDb()
    db.addModel(PetModel)

    // 3. ASSERT
    expect(db._models.Pet).to.not.be.empty
    expect(db._models.Pet.foreign_keys).to.not.be.empty
    expect(db._models.Pet.foreign_keys[fk]).to.equal(fkValue)

  });
});

describe('LinesDbModel.modelName', function () {
  it('should get model base name', function () {
    
    // 1. ARRANGE
    var expectedName = 'LinesDb'
    var model = LinesDbModel

    // 2. ACT
    var name = model.modelName

    // 3. ASSERT
    expect(name).to.equal(expectedName)

  });
});

describe('LinesDbModel.find()', function () {
  it('should find model of same type by Id', function () {
    //1. ARRANGE
    var model = PersonModel
    var id = 2

    // 2. ACT
    var db = new LinesDb(data)
    db.addModel(PersonModel)
    db.addModel(PetModel)
    var obj = model.find(id)

    // 3. ASSERT
    expect(obj).to.be.an.instanceof(LinesDbModel)
    expect(obj).to.be.an.instanceof(model)
    expect(obj.id).to.equal(id)
  });
});

describe('LinesDbModel.where()', function () {
  it('should filter the database by key value operation', function () {
    
    // 1. ARRANGE
    var model = PetModel
    var key = 'type'
    var value = 'dog'
    var operator = '='
    var expectedResultsLength = 4

    // 2. ACT
    var db = new LinesDb(data);
    db.addModel(PersonModel)
    db.addModel(PetModel)
    var collection = db.where(model.modelName, key, value, operator)

    // 3. ASSERT
    expect(collection).to.be.an.instanceof(LinesDbCollection)
    expect(collection._arr).to.not.be.empty;
    expect(collection._arr.length).to.equal(expectedResultsLength);
    expect(collection._arr[0]).to.be.instanceOf(LinesDbModel)

  });
});

describe('LinesDbModel.create()', function () {
  it('should create a new line in db for this model', function () {
    
    // 1. ARRANGE
    var model = PersonModel
    var objData = {
      name: 'Marc',
      age: 10
    }

    // 2. ACT
    var db = new LinesDb(data);
    db.addModel(PersonModel)
    db.addModel(PetModel)
    var obj = model.create(objData)
    var objDb = model.where('age', 10, '<=').first()

    // 3. ASSERT
    expect(obj).to.be.an.instanceof(LinesDbModel)
    expect(obj).to.be.an.instanceof(model)
    expect(objDb).to.be.an.instanceof(model)
    expect(objDb.id).to.equal(obj.id)

  });
});

describe('LinesDbModel.put()', function () {
  it('should update a line in db for this model', function () {
    
    // 1. ARRANGE
    var model = PersonModel
    var id = 2
    var objData = {
      age: 17
    }

    // 2. ACT
    var db = new LinesDb(data);
    db.addModel(PersonModel)
    db.addModel(PetModel)
    var obj = model.find(id)
    obj.setAge(16)
    obj.put()
    var newObj = model.find(id)

    // 3. ASSERT
    expect(obj).to.be.an.instanceof(LinesDbModel)
    expect(obj).to.be.an.instanceof(model)
    expect(obj.id).to.equal(newObj.id)
    expect(obj.getAge()).to.equal(newObj.getAge())

  });
});