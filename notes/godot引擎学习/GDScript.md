godot支持多种编程语言，其中默认为GDScript，与python语言相似
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
# 布尔值
