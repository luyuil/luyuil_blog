godot支持多种编程语言，其中默认为GDScript，与python语言相似，这里代码块以python来显示高亮
# 使用
通过将脚本挂载到节点上，即可通过脚本修改节点的属性
godot依靠函数来组织代码，函数就是一个代码块，通过将不同的函数组合起来来完成特定的功能

## godot有两个默认的函数
```     python
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

```
~={green}ready=~ 是初始化函数，在节点第一次进入场景是被调用
~={blue}process=~ 是帧更新函数，每帧都在不断地运行
# 函数
## 创建函数
创建函数要使用~={red}func=~关键字，确定函数名称，以及参数
## 调用函数
 直接调用，并填入对应参数
 内置函数无需创建，可直接调用
# 变量定义规范
1. 变量名称不能以数字开头
2. 名称内部不能包含空格
3. 不能使用特殊符号
# 数据类型
1. string
2. number
3. True/False
4. List
可以通过对变量类型进行限制，防止输入不匹配的变量类型，如下：
``` python
var tset: String = "Hello World"
```
test就只能接收String类型变量
# 属性与方法

> [!NOTE] Title
> 在godot中把节点直接拖入函数里可以获取这个节点的所有属性与方法，.p为属性，.f()为方法

属性就是节点里本身的各个属性包括：位置，角度等等
通过脚本函数可以直接实时控制这些属性变量
方法就是节点里自带的函数，填入相应的参数可以直接修改节点的属性

---

脚本挂载在目标节点上，直接书写属性名称和调用方法，如果是子节点，就要在前面添加~={green}$=~符号
# 布尔值与条件判断语句 
```python
func _process(delta: float) -> void:
	if($Sprite2D.position.x < 1086 and dir_flag == 0):
		$Sprite2D.position.x += 4
		if($Sprite2D.position.x >= 1086):
			dir_flag = !dir_flag
	elif($Sprite2D.position.x >= 64 and dir_flag == 1):
		$Sprite2D.position.x -= 4
		if($Sprite2D.position.x <= 64):
			dir_flag = !dir_flag
	pass
```
# 数据，字典，向量
## 向量
向量是游戏设计里非常常见的数据类型，频繁使用，方便计算
```python
var direction = Vector2(1,1)
var speed = 20

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	$Icon.position += direction * speed
	pass
```
## 数组
数据对存放的数据类型，元素数量没有限制，包括数组里存放数组
```python
var array = [1,2,3,'string',false,[1,2,3]]

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	# 依次打印数组内容
	for i in array:
		print(i)
	pass # Replace with function body.
```
## 字典
字典使用键值对结构，使用大括号包裹，内部有键名，冒号，对应数值组成，各组键值对之间使用逗号分隔，键和值都可以使用任意数据类型
```python
var dictionary = {'a':1, 123:[1,2,3], true:'string'}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	print(dictionary)
	print(dictionary[123])
	# 只能打印键名
	for i in dictionary:
		print(i)
	# 打印所有键值
	for i in dictionary.values():
		print(i)
	pass # Replace with function body.
```
使用字典存储数据时，数据含义会更加清晰直观，如果数组存放数据过多，阅读代码时容易产生混淆，很多场景使用字典时会更加简洁，可读性也更高
# 作用域与返回值
## 作用域
- 全局作用域：创建在函数外部，都可以调用
- 局部作用域：创建在函数内部，只能在当前函数中调用
## 返回值
返回机制决定了代码间数据的传递方式
```python
func retunre_value() -> int:
	print("return value function was run")
	return 1
```
