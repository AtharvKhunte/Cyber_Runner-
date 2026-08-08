// World.js — simple entity container (expand into ECS if needed)
export class World {
  constructor() { this.entities = []; }
  add(entity)    { this.entities.push(entity); return entity; }
  remove(entity) { this.entities = this.entities.filter(e => e !== entity); }
  update(dt, input) { this.entities.forEach(e => e.update?.(dt, input)); }
  render(ctx)       { this.entities.forEach(e => e.render?.(ctx)); }
}
