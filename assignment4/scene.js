function Scene(gl) {
  this.entities = []
  this.lights = []
  this.blendFuncStack = [{s: gl.ONE, d: gl.NONE}]
  this.camera = null
  this.modelMatrixStack = [translate(0,0,0)]

  gl.clearColor(0.12, 0.1, 0.15, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND)
  // gl.enable(gl.CULL_FACE)
  gl.depthFunc(gl.LEQUAL)
}

Scene.prototype.pushBlendFunc = function(gl, params) {
  this.blendFuncStack.push(params)
  gl.blendFunc(params.s, params.d)
}

Scene.prototype.popBlendFunc = function(gl) {
  this.blendFuncStack.pop()
  let params = this.getBlendFunc()
  gl.blendFunc(params.s, params.d)
}

Scene.prototype.getBlendFunc = function() {
  return this.blendFuncStack[this.blendFuncStack.length - 1]
}

Scene.prototype.pushModelMatrix = function(transform) {
  this.modelMatrixStack.push(transform)
}

Scene.prototype.popModelMatrix = function() {
  return this.modelMatrixStack.pop()
}

Scene.prototype.getModelMatrix = function() {
  return this.modelMatrixStack[this.modelMatrixStack.length - 1]
}

Scene.prototype.sendMvpUniforms = function(gl, locs) {
  //console.log(locs)
  gl.uniformMatrix4fv(locs.u_projMatrix, false, flatten(this.camera.projectionMatrix));
  gl.uniformMatrix4fv(locs.u_viewMatrix, false, flatten(this.camera.viewMatrix));
  gl.uniformMatrix4fv(locs.u_modelMatrix, false, flatten(this.getModelMatrix()));
}

Scene.prototype.draw = function(gl) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  this.entities.forEach((entity) => {
    this._drawInner(gl, entity)
  })
}

Scene.prototype._drawInner = function(gl, entity) {
  entity.bind(gl)
  this.pushModelMatrix(mult(entity.transform.transform, this.getModelMatrix()))
  this.sendMvpUniforms(gl, entity.material.shaderProgram.locs)
  gl.uniform1f(entity.material.shaderProgram.locs.numLights, this.lights.length)
  this.lights.forEach((light, i) => {
    if (i === 1) {
      this.pushBlendFunc(gl, {s: gl.ONE, d: gl.ONE})
    }
    light.sendData(gl, entity.material.shaderProgram.locs)
    //console.log(gl.getUniform(entity.material.shaderProgram, entity.material.shaderProgram.locs.lightPosition))
    entity.draw(gl)
  })
  this.popBlendFunc(gl)
  entity.children.forEach(child => this._drawInner(gl, child))
  this.popModelMatrix()
}


function Camera(transform, fov, aspect, near, far) {
  this.transform = transform
  this.fov = fov
  this.aspect = aspect
  this.near = near || 0.1
  this.far = far || 50
  this.computeProjection()
  this.computeView()
}

Camera.prototype.computeView = function() {
  this.transform.computeTransform()
  this.viewMatrix = inverse4(this.transform.transform)
}

Camera.prototype.computeProjection = function() {
  this.projectionMatrix = perspective(this.fov, this.aspect, this.near, this.far);
}

function Light(position, color) {
  this.position = position
  this.color = color
}

Light.prototype.sendData = function(gl, locs) {
  gl.uniform4fv(locs.lightPosition, flatten(this.position))
  gl.uniform3fv(locs.lightColor, flatten(this.color))
}