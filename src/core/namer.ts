import * as ast from "./ast";
import {
  assertScope,
  handleReactives,
  isPlaceholder,
  Placeholder,
  ReactiveAssignContext,
  ReactiveTracker,
  Scope,
  ScopeContext,
  scopePlaceholder,
} from "./scope";
import { PlaceholderError } from "./util";
import { WalkNode, walk } from "./walker";

export const lower = "abcdefghijklmnopqrstuvwxyz";
export const digit = "0123456789";

export interface NamingStrategy {
  resolveName(name: string | null): string;
}

export interface NameOptions {
  minimize: boolean; // if true, ignore desired names in symbols
  aggressive: boolean; // if true, may redeclare declared variables in parent scopes
  resolver: NamingStrategy; // how new names are chosen
}

export function setCharAt(s: string, i: number, c: string): string {
  return s.slice(0, i) + c + s.slice(i + 1);
}

export class UnderscorePrependStrategy implements NamingStrategy {
  resolveName(name: string | null): string {
    if (name == null) return "_";
    return `_${name}`;
  }
}

export class AppendNumberStrategy implements NamingStrategy {
  constructor(readonly appendString = "__", readonly startNumber = 1) {}

  resolveName(name: string | null): string {
    if (name == null) {
      name = "";
    }

    const appendIndex = name.lastIndexOf(this.appendString);
    if (appendIndex == -1) {
      return `${name}${this.appendString}${this.startNumber}`;
    }

    const currentNumber = name.substring(
      appendIndex + this.appendString.length
    );
    if (currentNumber.match(/[0-9]+/)) {
      // Increment the number
      const newNumber = parseInt(currentNumber) + 1;
      return `${name.substring(0, appendIndex)}${
        this.appendString
      }${newNumber}`;
    }
    if (currentNumber == "") {
      // Empty number, set to start number
      return `${name.substring(0, appendIndex)}${this.appendString}${
        this.startNumber
      }`;
    }
    // Last effort; it may be ugly, but append the expected structure anew
    return `${name}${this.appendString}${this.startNumber}`;
  }
}

export class IncrementalStrategy implements NamingStrategy {
  constructor(
    readonly firstCharacters = lower,
    readonly characters = lower + digit
  ) {}

  resolveName(name: string | null): string {
    // Suggests a new name
    if (name == null) {
      return this.firstCharacters[0];
    }

    // Read from the string backwards
    for (let i = name.length - 1; i >= 0; i--) {
      // Grab the last letter
      const c = name.charAt(i);
      const characterSet = i == 0 ? this.firstCharacters : this.characters;

      const currentIndex = characterSet.indexOf(c);
      if (currentIndex == -1) {
        // Character isn't being incrementally named, set to initial character of set
        return setCharAt(name, i, characterSet[0]);
      } else {
        // Increment the character
        const newIndex = currentIndex + 1;
        if (newIndex != characterSet.length) {
          // Can increment and just return
          return setCharAt(name, i, characterSet[newIndex]);
        } else {
          // At end of character set, we'll carry over
          name = setCharAt(name, i, characterSet[0]);
        }
      }
    }

    // If we still haven't returned, everything has carried over
    // We need to add a new letter at the end
    return name + this.characters[0];
  }
}

export const defaultNameOptions: NameOptions = {
  minimize: false,
  aggressive: false,
  resolver: new AppendNumberStrategy(),
};

export class Namer<T = WalkNode> {
  constructor(readonly nameOptions: NameOptions = defaultNameOptions) {}

  resolveName(name: string | null): string {
    // Suggests a new name
    return this.nameOptions.resolver.resolveName(name);
  }

  scopeHas(scope: Scope<T>, name: ast.Name): boolean {
    // Returns hasImmediate if aggressive is set
    if (this.nameOptions.aggressive) {
      return scope.hasImmediate(name);
    } else {
      // Otherwise returns has which is affected by
      // parent scopes
      return scope.has(name);
    }
  }

  getName(scope: Scope<T>, placeholder: Symbol): string {
    // Find the desired name to use
    let desiredName: string | null;
    if (this.nameOptions.minimize) {
      desiredName = null;
    } else if (placeholder.description != null) {
      desiredName = placeholder.description;
    } else {
      desiredName = null;
    }

    if (desiredName == null) {
      // Grab an available name as desired name
      desiredName = this.resolveName(null);
    }
    while (true) {
      if (!this.scopeHas(scope, desiredName)) {
        // Name is available, use it
        return desiredName;
      } else {
        // Name is unavailable, find one similar to it
        desiredName = this.resolveName(desiredName);
      }
    }
  }
}

export class ScopeRenamer extends Scope<WalkNode> {
  public shadowScope: Scope<ast.Name>;
  public nameScope: Scope<ast.Name>;
  public nameMap: { [name: ast.Name]: string } = {};
  public namer = new Namer<ast.Name>(this.nameOptions);

  constructor(
    readonly parent: ScopeRenamer | null = null,
    readonly nameOptions: NameOptions = defaultNameOptions
  ) {
    super(parent, scopePlaceholder);
    this.shadowScope =
      parent == null
        ? new Scope<ast.Name>(null, scopePlaceholder)
        : new Scope<ast.Name>(parent.shadowScope, scopePlaceholder);
    this.nameScope =
      parent == null
        ? new Scope<ast.Name>(null, scopePlaceholder)
        : new Scope<ast.Name>(parent.nameScope, scopePlaceholder);
  }

  addDeclaration(name: ast.Name, node: WalkNode): ast.Name {
    super.addDeclaration(name, node);
    const renamed = this.namer.getName(this.shadowScope, Symbol());
    this.shadowScope.addDeclaration(renamed, name);
    this.nameScope.addDeclaration(name, renamed);
    return renamed;
  }

  addReference(name: ast.Name, node: WalkNode | Placeholder): ast.Name {
    super.addReference(name, node);
    const renamed = this.nameScope.get(name);
    if (isPlaceholder(renamed)) {
      throw new PlaceholderError("Unexpected placeholder");
    }
    return renamed;
  }
}

export function normalizeProgram(
  program: ast.Program,
  nameOptions: NameOptions = defaultNameOptions
) {
  walk(
    program,
    new ScopeContext<ScopeRenamer>(
      (parent) => new ScopeRenamer(parent, nameOptions)
    )
  );
}

export function analyzeScopes(
  program: ast.Program,
  namer: Namer = new Namer()
): Scope {
  const reactiveTracker = new ReactiveTracker();
  const scopeContext = new ScopeContext(
    (parent, node) => new Scope(parent, node)
  );
  const reactiveAssignContext = new ReactiveAssignContext(scopeContext);

  walk(program, {
    enter(object) {
      // Handle reactives
      reactiveTracker.enter(object);
      // Handle scopes
      scopeContext.enter(object);
      // Handle reactive assigns
      reactiveAssignContext.enter(object);
    },
    leave(object) {
      // Handle reactives
      const reactives = reactiveTracker.leave(object);
      if (reactives.length > 0) {
        handleReactives(object, reactives, scopeContext);
      }
      // Handle scopes
      scopeContext.leave(object);
    },
  });

  assertScope(scopeContext.rootScope);

  // Sub all scope placeholders
  scopeContext.rootScope.subPlaceholders(namer);

  return scopeContext.rootScope;
}
