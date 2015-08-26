
function cloneObject(e){var n;if(null==e||"object"!=typeof e)return e;if(e instanceof Date)return n=new Date,n.setTime(e.getTime()),n;if(e instanceof Array){n=[];for(var t=0,r=e.length;r>t;t++)n[t]=cloneObject(e[t]);return n}if(e instanceof Object){n={};for(var o in e)e.hasOwnProperty(o)&&(n[o]=cloneObject(e[o]));return n}throw new Error("Unable to copy obj! Its type isn't supported.")}

exports = module.exports = new (function() {

    this.hideText = false;

    var colors       = require('chalk');
    var readlineSync = require('readline-sync');
    var fs           = require('fs');
    var path         = require('path');

    var functions = {
        __DISPLAY_VARS: function(args, vars) {
            console.log(vars);
        },

        is_number  : function(v) { return typeof v[0] === 'number' && Number.isFinite(v[0]); },
        is_string  : function(v) { return typeof v[0] === 'string'; },
        is_object  : function(v) { return typeof v[0] === 'object' && v[0] && !Array.isArray(v[0]); },
        is_array   : function(v) { return Array.isArray(v[0]); },
        is_null    : function(v) { return v[0] === null; },
        is_infinity: function(v) { return v[0] === Infinity; },
        is_empty   : function(v) { return typeof v[0] === 'string' && v[0].length; },

        is_number_string: function(v) { return true; return (typeof v[0] === 'number' && Number.isFinite(v[0])) || (typeof v[0] === 'string' && !Number.isNaN(parseInt(v[0]))); },

        write: function(args, ctx) {
            if(ctx.parse)
                return ;

            for(var i = 0; i < args.length - 1; i++) {
                args[args.length - 1] = colors[args[i]] ? colors[args[i]](args[args.length - 1]) : args[args.length - 1];
            }

            console.log(ctx.formatString(args[i], ctx));
        },

        prompt: function(args, ctx) {
            var result = readlineSync.question(args[0] + ' ');

            if(ctx.vars.__prompt_newline)
                console.log('');

            return result;
        },

        choice: function(args, ctx) {
            var result = args[readlineSync.keyInSelect(args, colors.green(': '), {
                cancel: false,
                guide: false
            })];

            if(ctx.vars.__choice_newline)
                console.log('');

            return result;
        },

        confirm: function(args) {
            return readlineSync.keyInYNStrict(args[0]);
        },

        clear: function(args) {
            console.log('\033[2J');
        },

        fatal: function(args, ctx) {
            throw new Error(colors.red.bold('Fatal error : ' + args[0] + '\n       In ' + colors.cyan(ctx.filename) + ' at line ' + colors.cyan(ctx.line) + '\n       Namespace ' + colors.green(ctx.namespace)));
        }
    };

    var namespaces = {
        'MAIN': {
            vars: {},
            modules : {},
            packages: {}
        },
        '__EMPTY': {
            vars: {},
            modules : {},
            packages: {}
        }
    };

    this.load = function(path, namespace) {
        path += '.ncs';

        try {
            var content = fs.readFileSync(path, 'utf-8');
        }

        catch(e) {
            throw new Error(colors.bold.red('Can\'t load NCS file : ' + colors.cyan(path)));
        }

        return this.run(content, namespace, path);
    };

    this.run = function(content, namespace, filename, parse, preserveParseNameSpace) {

        function fatal(message) {
            throw new Error(colors.red.bold('Fatal error : ' + message + '\n       In ' + colors.cyan(filename) + ' at line ' + colors.blue(i + 1) + '\n       Namespace ' + colors.green(namespace)));
        }

        filename  = (filename  || ':unknown');
        namespace = (namespace || 'MAIN'  );

        if(parse) {
            namespaces['__PARSE'] = cloneObject(namespaces.__EMPTY);
            namespace = '__PARSE';
        }

        if(!namespaces[namespace]) {
            return fatal('Namespace ' + colors.cyan(namespace) + ' is not defined');
        }

        var vars      = namespaces[namespace].vars     ;
        var modules   = namespaces[namespace].modules  ;
        var packages  = namespaces[namespace].packages ;

        // get the value of a variable
        function get_var(name) {
            if(name.indexOf('.') === -1)
                return vars[name];

            name = name.split('.');
            var p = vars;

            for(var i = 0; i < name.length; i++) {
                if(!p.hasOwnProperty(name[i]))
                    return ;

                p = p[name[i]];
            }

            return p;

        }

        // set the value of a variable
        function set_var(name, value) {
            if(name.indexOf('.') === -1) {
                vars[name] = value;
                return true;
            }

            name = name.split('.');
            var p = vars;

            for(var i = 0; i < name.length - 1; i++) {
                if(!p.hasOwnProperty(name[i]))
                    return false;

                p = p[name[i]];
            }

            if(!p.hasOwnProperty(name[i]))
                return ;

            p[name[i]] = value;
            return true;
        }

        // run a function from a code
        function func(code) {
            // check syntax is valid
            var args = [];

            code = code
                    .replace(/^([a-zA-Z_]+)\((.*)\)$/, '$1 $2')
                    .match(/(?:[^\s"]+|"[^"]*")+/g);

            if(!functions[code[0]] && !modules[code[0]]) {
                return fatal('Function ' + colors.cyan(code[0]) + ' is not defined');
            }

            for(var j = 1; j < code.length; j++) {
                if(!j)
                    continue;

                args.push(val(code[j]));
            }

            if(functions[code[0]]) {
                var context = {
                    vars: vars,
                    modules: modules,
                    packages: packages,
                    namespace: namespace,
                    filename: filename,
                    line: i,
                    parse: parse,
                    formatString: function(str, ctx) {
                        str = str.replace(/([^\\])\{([a-zA-Z0-9_]+)\}/g, function(match, prefix, varName) {
                            return prefix + ctx.vars[varName];
                        });

                        var regex = /([^\\])\{\{([a-zA-Z,\/\-_]+)\}\}(.*)$/g;
                        var openedColors = [];

                        while(str.match(regex))
                            str = str.replace(regex, function(match, prefix, color, end) {
                                var open;

                                color = color.split(',');

                                for(var n = 0; n < color.length; n += 1) {
                                    open = color[n].substr(0, 1) !== '/' && color[n].substr(0, 1) !== '-' && color[n].substr(0, 1) !== '_';

                                    if(open) {
                                        openedColors.push(color[n]);
                                    } else {
                                        color[n] = color[n].substr(1);

                                        if(openedColors.indexOf(color[n]) !== -1)
                                            openedColors.slice(openedColors.indexOf(color[n]), 1);
                                    }

                                    end = colors.styles[color[n]] ? colors.styles[color[n]][open ? 'open' : 'close'] + end : end;
                                }

                                return prefix + end;
                            });

                        for(var o = 0; o < openedColors.length; o += 1)
                            if(colors.styles[openedColors[o]])
                                str += colors.styles[openedColors[o]].close;

                        str = str
                            .replace(/\\(.)/g, function(match, suffix) {
                                return suffix;
                            });

                        return ctx.vars.__allow_simultaneous_spaces ? str : str.replace(/( ){2,}/g, ' ');
                    }
                };

                return functions[code[0]](args, context);
            } else {
                var module_namespace = '__MODULE_' + code[0];

                if(args.length < modules[code[0]].args.length) {
                    return fatal('Missing ' + colors.cyan(modules[code[0]].args.length - args.length) + ' arguments for module ' + colors.green(code[0]) + ', ' + colors.cyan(modules[code[0]].args.length) + ' arguments expected');
                }

                if(args.length > modules[code[0]]) {
                    return fatal('Too many arguments for module ' + colors.green(code[0]) + ', ' + colors.cyan(modules[code[0]].args.length - args.length) + ' given but ' + colors.cyan(modules[code[0]].args.length) + ' arguments expected');
                }

                namespaces[module_namespace] = cloneObject(namespaces[namespace]);

                for(var i = 0; i < args.length; i++) {
                    namespaces[module_namespace].vars[modules[code[0]].args[i]] = args[i];
                }

                return exports.run(modules[code[0]].code, module_namespace);
            }

        }

        function val(value) {
            if(value === 'false')
                return false;

            if(value === 'true')
                return true;

            if(value === 'null')
                return false;

            if(value.match(/^([a-zA-Z_]+)\(\)/))
                return parse ? null : func(value.substr(0, value.length - 2));

            if(value.match(/^("|')(.*)("|')$/))
                return value.substr(1, value.length - 2);

            if(value.match(/^([0-9\.\+\-\*\/]+)$/))
                return parseInt(value);

            if(value.match(/^\{([a-zA-Z_]+)\}$/))
                return get_var(value.substr(1, value.length - 2));

            if(value.match(/^([a-zA-Z_]+)$/))
                return value;

            return parse ? null : func(value);
        }

        content = content
                    .replace(/###((.|\n)*)###/g, '')
                    .replace(/#(.*)$/gm, '')
                    .replace(/\n+/g, '\n')
                    .replace(/^\n/, '')
                    .replace(/\n$/, '')
                    .split('\n');

        content.push('return null');

        var line, indent, match, code;

        var IF = []          ,
            in_module = false,
            in_module_args   ,
            start_module_line;

        for(var i = 0; i < content.length; i++) {
            line   = content[i];
            indent = line.match(/^( *)/)[0].length;
            code   = line.trim();

            if(!code)
                continue ;

            if(in_module) {
                if(!indent) {
                    // module declaration is finished !
                    // module code is lines from "start_module_line" to "i" (excluded)
                    var lines = [];
                    for(var j = start_module_line + 1; j < i; j++) {
                        lines.push(content[j]);
                    }

                    if(!in_module_args.match(/^( *)$/)) {
                        in_module_args = in_module_args.split(',');

                        for(j = 0; j < in_module_args.length; j++) {
                            in_module_args[j] = in_module_args[j].trim();
                        }
                    } else  {
                        in_module_args = [];
                    }

                    modules[in_module] = {
                        args: in_module_args,
                        code: lines.join('\n')
                    };

                    in_module = false;
                } else {
                    continue ;
                }
            }

            if(code !== 'else')
                IF.splice(indent + 1, IF.length - (indent + 1));

            /*while(code !== 'else' && IF.length - 1 > indent) {
                IF.splice(IF.length, 1);
            }*/

            if(code === 'else') {
                IF[indent] = !IF[indent];
                continue ;
            }

            if(IF.length && !IF[IF.length - 1]) {
                continue ;
            }

            // test a condition
            if(code.match(/^if /)) {
                // test the condition
                code = code.substr(3);
                if(code.match(/^([a-zA-Z_]+)$/)) {
                    // test if a variable is true
                    IF[indent] = !!get_var(code);
                } else if((match = code.match(/^([a-zA-Z_]+)( *)(is|isnt|exists|==|\!=|>|<|>=|<=)( *)(.*)$/))) {
                    // test if a variable is equals to another value or variable

                    var subject    = match[1];
                    var comparator = match[3];
                    var compared   = match[5];

                    if(comparator === 'exists') {
                        IF[indent] = vars.hasOwnProperty(subject);
                        continue ;
                    }

                    if(compared.match(/^([a-zA-Z_]+)$/)) {
                        // subject and compared are variables' name
                        compared = get_var(compared);
                    } else {
                        compared = val(compared);
                    }

                    switch(comparator) {
                        case '==':
                        case 'is':
                            IF[indent] = get_var(subject) == compared;
                            break;

                        case '!=':
                        case 'isnt':
                            IF[indent] = get_var(subject) != compared;
                            break;

                        case '>':
                            IF[indent] = get_var(subject) > compared;
                            break;

                        case '<':
                            IF[indent] = get_var(subject) < compared;
                            break;

                        case '>=':
                            IF[indent] = get_var(subject) >= compared;
                            break;

                        case '<=':
                            IF[indent] = get_var(subject) <= compared;
                            break;

                        default:
                            return fatal('Unknown comparator : ' + colors.cyan(comparator));
                            break;
                    }
                }

                continue ;
            }

            if((match = code.match(/^([a-zA-Z_]+)( *)=( *)(.*)$/))) {
                // variable assign
                set_var(match[1], val(match[4]));
                //vars[match[1]] = val(match[4]);
                continue ;
            }

            if(code.match(/^module /)) {
                // module declaration
                if(!(match = code.match(/^module( *)([a-zA-Z0-9_]+)( *)\((.*)\)$/))) {
                    return fatal('Bad module declaration : ' + colors.cyan.italic('<name>') + ' must be composed of letters, digits and underscores');
                }

                in_module         = match[2];
                in_module_args    = match[4];
                start_module_line = i;
                continue ;
            }

            if(code.match(/^return /)) {
                if(!parse) {
                    return val(code.replace(/^return( +)/, ''));
                } else {
                    continue ;
                }
            } else if(code.match(/^return$/)) {
                return ;
            }

            if(code.match(/^include /)) {
                var target = path.resolve(filename, path.join('..', code.replace(/^include( *)/, ''))).substr(process.cwd().length + 1);
                this.load(target, namespace);
                continue ;
            }

            if((match = code.match(/^declare( *)(variable|namespace)( *)([a-zA-Z_]+)$/))) {
                if(match[2] === 'variable') {
                    if(!namespaces[namespace][type].hasOwnProperty(match[4])) {
                        namespaces[namespace][type][match[4]] = undefined;
                    }
                } else if(match[2] === 'namespace') {
                    if(!namespaces.hasOwnProperty(match[4])) {
                        namespaces[match[4]] = cloneObject(namespaces.__EMPTY);
                    }
                }

                continue ;
            } else if(code.match(/^declare $/)) {
                fatal('Bad declaration syntax : Must be ' + colors.cyan('declare (variable|module) [name]'));
            }

            if((match = code.match(/^delete( *)(variable|module|package|namespace)( *)([a-zA-Z_]+)$/))) {
                if(match[2] === 'variable') {
                    if(!namespaces[namespace]['vars'].hasOwnProperty(match[4])) {
                        fatal('Variable ' + colors.cyan(match[4]) + ' is not defined');
                    } else {
                        delete namespaces[namespace]['vars'][match[4]];
                    }
                } else if(match[2] === 'module') {
                    if(!namespaces[namespace]['modules'].hasOwnProperty(match[4])) {
                        fatal('Module ' + colors.cyan(match[4]) + ' is not defined');
                    } else {
                        delete namespaces[namespace]['modules'][match[4]];
                    }
                } else if(match[2] === 'package') {
                    if(!namespaces[namespace]['packages'].hasOwnProperty(match[4])) {
                        fatal('Package ' + colors.cyan(match[4]) + ' is not defined');
                    } else {
                        delete namespaces[namespace]['packages'][match[4]];
                    }
                } else if(match[2] === 'namespace') {
                    if(!namespaces.hasOwnProperty(match[4])) {
                        fatal('Namespace ' + colors.cyan(match[4]) + ' is not defined');
                    } else {
                        delete namespaces[match[4]];
                    }
                }

                continue ;
            } else if(code.match(/^delete $/)) {
                fatal('Bad deletion syntax');
            }

            if((match = code.match(/^use( *)namespace( *)([a-zA-Z0-9_]+)$/))) {
                if(!namespaces.hasOwnProperty(match[3])) {
                    fatal('Namespace ' + colors.cyan(match[3]) + ' is not defined');
                } else {
                    namespace = match[3];
                    vars      = namespaces[namespace].vars     ;
                    modules   = namespaces[namespace].modules  ;
                    packages  = namespaces[namespace].packages ;
                }

                continue ;

            } else if(code.match(/^use( *)namespace /)) {
                fatal('Bad use syntax : Must be ' + colors.cyan('use namespace [name]'))
            }

            if(code.match(/^import /)) {

                match = code.match(/^import( *)from( *)(package|namespace)( *)([a-zA-Z_\-]+)( *)(variable|module)( *)([a-zA-Z_]+)( *)(as|)( *)([a-zA-Z_]*)$/);

                if(!match) {
                    match = code.match(/^import( *)(package|namespace)\/(variable|module)( *)([a-zA-Z_\-]+)\/([a-zA-Z_]+)$/);

                    if(match)
                        match = [0, 0, 0, match[2], 0, match[5], 0, match[3], 0, match[6]];
                    else
                        fatal('Bad import syntax');
                }

                // import a module from a package

                // match[3] : import from   ("package" or "namespace" )
                // match[5] : import name   (package or namespace name)
                // match[7] : import type   ("variable" or "module"   )
                // match[9] : import target (variable or module name  )
                // match[11] : import as    ("as" or nothing)
                // match[13] : import alias (new variable or module name)

                if(match[11] && !match[13])
                    fatal('IMPORT : ' + colors.cyan('AS') + ' keyword is used, but alias is missing');

                if(match[3] === 'package') {
                    // import a package

                    if(!packages[match[3]]) {
                        // we import the entire package
                        var main = path.join('.ncs_packages', match[5], 'main');

                        try {
                            var packge = fs.readFileSync(main + '.ncs', 'utf-8')
                        }

                        catch(e) {
                            main = path.join(__dirname, '.ncs_packages', match[5], 'main');

                            try {
                                var packge = fs.readFileSync(main + '.ncs', 'utf-8');
                            }

                            catch(e) {
                                fatal('Unable to open package ' + colors.cyan(match[5]));
                            }
                        }

                        namespaces[namespace].packages[match[5]] = this.run(packge, null, main, true);
                    }

                    var imprt = namespaces[namespace].packages[match[5]];
                } else if(match[3] === 'namespace') {
                    // import a namespace
                    if(!namespaces[match[5]])
                        fatal('Namespace ' + colors.cyan(match[5]) + ' is not defined');

                    var imprt = namespaces[match[5]];
                }

                // match[7] : import type   ("variable" or "module"   )
                // match[9] : import target (variable or module name  )
                // match[11] : import as    ("as" or nothing)
                // match[13] : import alias (new variable or module name)

                var import_target;

                match[7] = match[7] == 'variable' ? 'vars' : 'modules';

                if(!imprt[match[7]].hasOwnProperty(match[9]))
                    return fatal('IMPORT : ' + match[7] + ' ' + colors.cyan(match[9]) + ' is not defined in imported ' + colors.cyan(match[5]));

                import_target = imprt[match[7]][match[9]];

                if(!match[11]) {
                    // import with no alias
                    namespaces[namespace][match[7]][match[9]] = import_target;
                } else {
                    // import as an alias
                    namespaces[namespace][match[7]][match[13]] = import_target;
                }

                continue ;
            }

            // function
            func(code);

            continue ;
        }

        if(parse) {
            var namespce = namespaces[namespace];

            if(!preserveParseNameSpace) // free memory
                delete namespaces[namespace];

            return namespce;
        }
    };

})();
