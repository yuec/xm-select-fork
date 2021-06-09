import { h, Component, render } from 'preact'
import { deepMerge, isFunction } from '@/common/util'

const emptyVal = {};

class Cascader extends Component{

	constructor(options){
		super(options);

		this.state = {
			expand: [],
			filterValue: '',
			remote: true,
			loading: false,
			val: emptyVal,
		}


		this.searchCid = 0;
		this.inputOver = true;
		this.__value = '';
		this.tempData = [];

	}

	blockClick(e){
		e.stopPropagation();
	}

	optionClick(item, selected, disabled, type, index, e){
		if(type === 'line'){
			if(disabled){
				return ;
			}
			//加载中的不需要进行处理
			if(item.__node.loading === true){
				return;
			}

			const { cascader, prop, sels } = this.props;

			//不是父节点的不需要处理
			if(!cascader.lazy && !item[prop.optgroup]){
				this.props.ck(item, selected, disabled);
				return
			}

			let expand = this.state.expand.slice(0, index + 1);
			expand[index] = item[this.props.prop.value];
			this.setState({ expand });
		}else if(type === 'checkbox'){
			this.props.ck(item, selected, disabled);
		}
		//阻止父组件上的事件冒泡
		this.blockClick(e);
	}

	searchInput(e){
		let v = e.target.value;

		if(v === this.__value){
			return ;
		}

		clearTimeout(this.searchCid);
		if(this.inputOver){
			//保证输入框内的值是实时的
			this.__value = v;

			//让搜索变成异步的
			this.searchCid = setTimeout(() => {
				this.callback = true;
				this.setState({ filterValue: this.__value, remote: true })
			}, this.props.delay);
		}
	}

	focus(){
		this.searchInputRef && this.searchInputRef.focus();
	}

	blur(){
		this.searchInputRef && this.searchInputRef.blur();
	}


	//组件将要接收新属性
	componentWillReceiveProps(props){

	}

	//组件将要被挂载
	componentWillMount(){

	}

	postData(){
		if(this.state.remote){
			this.callback = false;
			this.setState({ loading: true, remote: false });
			//让输入框失去焦点
			this.blur();
			this.props.remoteMethod(this.state.filterValue, (result, totalSize) => {
				//回调后可以重新聚焦
				this.focus();
				this.callback = true;
				this.setState({ loading: false, totalSize });
				this.props.onReset(result, 'data');
			}, this.props.show, 1);
		}
	}

	filterData(data, val, parentHidden){
		const { prop, filterMethod, cascader } = this.props;
		const { children, optgroup, name, value } = prop;
		
		data.forEach((item, index) => {
			//首先判断父节点的状态是显示还是隐藏
			let hiddenStatus = val ? !filterMethod(val, item, index, prop) : false;
			//严格模式下, 不计算父节点的状态
			let thisParentHidden;
			if(cascader.strict){
				thisParentHidden = false;
			}else{//非严格模式下, 父节点显示, 子节点无条件显示
				thisParentHidden = parentHidden === false ? false : hiddenStatus;
				hiddenStatus = thisParentHidden
			}
			//如果包含了子节点
			if(item[optgroup]){
				//过滤出来子节点的数据
				let child = this.filterData(item[children], val, thisParentHidden);
				let childHiddenStatus = val ? child.filter(c => !c.__node.hidn).length === 0 : false;

				//严格模式下子节点都隐藏了, 父节点也不显示
				if(cascader.strict){
					hiddenStatus = childHiddenStatus;
				}else{//非严格模式, 父节点没有搜索到, 看看子节点有没有显示的
					hiddenStatus = thisParentHidden && childHiddenStatus;
				}

				
			}else{
					
				if(!item.search_name){
					var parent = item;
					item.search_name = [];
					while(parent){
						item.search_name.push(parent.name);
						parent = parent.__node.parent;
					}

					item.search_name = item.search_name.reverse().join(' / ');
					this.tempData.push(item);
				}

			}
			item.__node.hidn = hiddenStatus;


		});
		return data;
	}


	searchInput(e){
		let v = e.target.value;

		if(v === this.__value){
			return ;
		}

		clearTimeout(this.searchCid);
		if(this.inputOver){
			//保证输入框内的值是实时的
			this.__value = v;

			//让搜索变成异步的
			this.searchCid = setTimeout(() => {
				this.callback = true;
				this.setState({ filterValue: this.__value, remote: true })
			}, this.props.delay);
		}
	}

	focus(){
		this.searchInputRef && this.searchInputRef.focus();
	}

	blur(){
		this.searchInputRef && this.searchInputRef.blur();
	}

	handleComposition(e){
		let type = e.type;

		if(type === 'compositionstart'){
			this.inputOver = false;
			clearTimeout(this.searchCid);
		}else if(type === 'compositionend'){
			this.inputOver = true;
			this.searchInput(e);
		}
	}

	blockClick(e){
		e.stopPropagation();
	}

	render(config, state) {
		const { prop, empty, sels, theme, radio, template, data,filterable, remoteSearch, searchTips, cascader } = config;
		let { name, value, disabled, children } = prop;
		const showIcon = config.model.icon != 'hidden';

		const renderItem = (item, indent, index, checked) => {
			//是否被选中
			let selected = !!sels.find(sel => sel[value] == item[value]);
			//是否禁用
			let dis = item[disabled]
			// 是否半选
			let half = item.__node.half === true;

			//是否遵义严格父子结构
			if(cascader.strict){
				selected = selected || half || item.__node.selected
				dis = dis || item.__node.disabled;
			}

			const iconStyle = selected ? {
				color: theme.color,
				border: 'none'
			} : {
				borderColor: theme.color,
			};

			const isParent = item[children] && item[children].length > 0;
			const itemStyle = { backgroundColor: 'transparent' }
			const className = ['xm-option', (dis ? ' disabled' : ''), (selected ? ' selected' : ''), (showIcon ? 'show-icon' : 'hide-icon') ].join(' ');
			const iconClass = (() => {
				if(isParent && config.iconfont.parent === 'hidden'){
					return 'xm-option-icon-hidden'
				}
				return ['xm-option-icon', (() => {
					//如果是半选状态，但是没有配置半选图标就用默认的
					if(half){
						return config.iconfont.half ? config.iconfont.half + ' xm-custom-icon' : 0;
					}
					if(isParent && config.iconfont.parent){
						return config.iconfont.parent + ' xm-custom-icon';
					}
					if(selected){
						return config.iconfont.select ? config.iconfont.select : 0;
					}
					return config.iconfont.unselect ? config.iconfont.unselect + ' xm-custom-icon' : 0;
				})() || ('xm-iconfont ' + (radio ? 'xm-icon-danx' : cascader.strict && half ? 'xm-icon-banxuan' : 'xm-icon-duox'))].join(' ');
			})()


			if(item[value] === this.state.val){
				itemStyle.backgroundColor = theme.hover
			}

			const contentStyle = {}, checkedStyle = {};
			if(checked){
				contentStyle.color = theme.color
				contentStyle.fontWeight = 700
				checkedStyle.color = theme.color
			}
			let checkedClass = 'xm-right-arrow';

			//处理鼠标选择的背景色
			const hoverChange = e => {
				if(e.type === 'mouseenter'){
					if(!item[disabled]){
						this.setState({ val: item[value] })
					}
				}else if(e.type === 'mouseleave'){
					this.setState({ val: '' })
				}
			}

			let name_key = 'name';
			if(!isParent && this.state.filterValue ){
				name_key  = 'search_name';
			}

			return (
				<div class={ className } style={ itemStyle } value={ item[value] } onClick={
					this.optionClick.bind(this, item, selected, dis, 'line', index)
				} onMouseEnter={ hoverChange } onMouseLeave={ hoverChange }>
					{ showIcon && <i class={ iconClass } style={ iconStyle } onClick={ this.optionClick.bind(this, item, selected, dis, 'checkbox', index) }></i> }
					<div class='xm-option-content' style={ contentStyle } dangerouslySetInnerHTML={{ __html: template({ data, item, arr: sels, name: item[name_key], value: item[value] }) }}></div>
					{ item[children] && <div class={ checkedClass } style={ checkedStyle }></div> }
				</div>
			)
		}

		let boxArr = [];
		const renderGroup = (item, indent, index) => {
			if(item.__node.hidn){
				return;
			}

			// this.state.filterValue

			const child = item[children];
			indent = indent + cascader.indent + 6

			const checked = child && this.state.expand[index] === item[value];
			checked && boxArr.push(
				<div class="xm-cascader-box" index={ index % 4 } style={{ left: indent + 'px', width: cascader.indent + 'px'}}>
					<div class="xm-cascader-scroll">{ child.map(c => renderGroup(c, indent, index + 1)) }</div>
				</div>
			)
			return renderItem(item, indent, index, checked)
		}

		//这里处理过滤数据
		if(filterable){
			//检查是否需要远程搜索
			if(remoteSearch){
				this.postData();
			}else{
				this.filterData(data, this.state.filterValue);
			}
		}

		let arr = (this.state.filterValue ? this.tempData : data).map(item => renderGroup(item, 2, 0)).concat(boxArr).filter(a => a);
		// let safetyArr = deepMerge([], arr);
		// let safetySels = deepMerge([], sels);

		if(!arr.length){
			arr.push(<div class="xm-select-empty">{ empty }</div>)
		}

		const search = (
			<div class={ filterable ? 'xm-search' : 'xm-search dis' }>
				<i class="xm-iconfont xm-icon-sousuo"></i>
				<input class="xm-input xm-search-input" placeholder={ searchTips } />
			</div>
		);

		return (
			<div onClick={ this.blockClick } class="xm-body-cascader" >
				{ search }
				<div class="scroll-body" style={{ width: cascader.indent + 'px', maxHeight: config.height }}>	
					{ arr }
				</div>
			</div>
		)
	}

	//组件完成挂载
	componentDidMount(){
		this.props.onReset('cascader', 'class');

		let input = this.base.querySelector('.xm-search-input');
		if(input){
			input.addEventListener('compositionstart', this.handleComposition.bind(this));
			input.addEventListener('compositionupdate', this.handleComposition.bind(this));
			input.addEventListener('compositionend', this.handleComposition.bind(this));
			input.addEventListener('input', this.searchInput.bind(this));
			this.searchInputRef = input;
		}
	}

		//此时页面又被重新渲染了
	componentDidUpdate(){
		if(this.callback){
			this.callback = false;

			let done = this.props.filterDone;
			if(isFunction(done)){
				done(this.state.filterValue, this.tempData || []);
			}
		}
	}

	//此时页面又被重新渲染了
	// componentDidUpdate(){}
}

export default Cascader;
