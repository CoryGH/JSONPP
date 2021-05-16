# JSON

## Objective

The objective of this project is to provide a practical implementation of JSON parsing and stringification with added functionality and versatility over the JSON standard.

-------------------------

## Additional Features

### Lambdas

Contextless lambda expressions are supported within this library, for example:

    JSONPP.stringify({
        add: function (left, right) {
            return (left + right);
        {
    });

will produce:

    {
        "add": (left, right) => {
            return (left + right);
        }
    }

and translate back to the original object via `JSONPP.parse()`.

### Object References

JSON++ handles circular object references by reducing all references to the same object to a path-based identifier.

    let obj1 = {
        foo: 'bar'
    };
    let obj2 = {
        baz: obj1
    };
    obj1.qux = obj2;
    obj1.quux = obj2;
    JSONPP.stringify(obj1);

Produces:

    {
        "foo": "bar",
        "qux": {
            "baz": /
        },
        "quux": /"qux"
    }

as well as the following for arrays:

    let obj1 = {
        foo: ['bar']
    };
    let obj2 = {
        baz: obj1
    };
    obj1.foo.push(obj2);
    obj1.qux = obj2;
    JSONPP.stringify([obj1]);

    [
        {
            "foo": [
                "bar",
                {
                    "baz": /
                }
            ],
            "qux": /"foo"/[1]
        }
    ]

### Root Level Arrays

This JSON interpreter allows for root-level arrays, for example:

    JSONPP.stringify([
        {
            name: 'foo'
        },
        {
            name: 'bar'
        }
    ]);

will yield:

    [
        {
            "name": "foo"
        },
        {
            "name": "bar"
        }
    ]

and will translate back to the original array via `JSON.parse()`.

### Type Preservation

Type preservation is possible assuming definitions of types exist on the `parse` end of the data, otherwise `Object` instantiation will occur as normal JSON would.  Example:

    class Foo {
		constructor(settings) {
    		this._bar = (settings.hasOwnProperty('Baz') ? settings['Baz'] : 'baz');
        }
        
        get Bar() { return (this._bar); }
        set Bar(value) { this._bar = value; }
    }
    
    class Baz extends Foo {
        constructor(settings) {
            super(settings);
            this._qux = (settings.hasOwnProperty('Qux') ? settings['Qux'] : 'qux');
            this._quux = (settings.hasOwnProperty('Quux') ? settings['Quux'] : 'quux');
        }
    
        get Qux() { return (this._qux); }
        set Qux(value) { this._qux = value; }
        
        get Quux() { return (this._quux); }
        set Quux(value) { this._quux = value; }
    }
    
    let baz = {
        baz: new Baz({ })
    };
    console.log(exports.stringify(baz, undefined, 4, true));

Produces:

    {
        "baz": Baz {
            "Bar": "baz",
            "Quux": "quux",
            "Qux": "qux"
        }
    }

Which translates back into an instance of `Baz` via:

    console.log(exports.parse(exports.stringify(baz), {
        Foo: Foo,
        Baz: Baz
    }));

To yield:

    {
        "baz": new Baz({
            "Bar":"baz",
            "Quux":"quux",
            "Qux":"qux"
        })
    }