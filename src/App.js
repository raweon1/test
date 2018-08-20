import React, {Component} from 'react';
import './App.css';
import {Tooltip, Menu, MenuDivider, MenuItem, Popover, Position, Icon, Checkbox, Colors} from '@blueprintjs/core'
import {WindowScroller, Table, Column, InfiniteLoader, AutoSizer} from "react-virtualized";

import {HiddenRowTable} from "./HiddenRowTable"
import {getTestData} from "./test_data";

function ColorMenuItem(props) {
    return (
        <MenuItem icon={<Icon icon="stop" color={props.color}/>}
                  text={props.text}
                  onClick={props.onClick.bind(null, props.color)}
                  labelElement={props.labelElement}
        />
    );
}

function ColorMenu(props) {
    // Farben können durch Erweiterung des Arrays colors hinzugefügt werden
    let colors = [Colors.VERMILION5, Colors.ROSE5, Colors.VIOLET5, Colors.INDIGO5, Colors.COBALT5, Colors.TURQUOISE5,
        Colors.FOREST5, Colors.LIME5, Colors.GOLD5, Colors.SEPIA5];
    const items = colors.map((color) =>
        <ColorMenuItem color={color} text={"foo"} onClick={props.onColorMenuClick} key={color}/>
    );
    return (
        <MenuItem icon="highlight" text="Markiere Zelle" onClick={() => {}}>
            {items}
        </MenuItem>
    );
}

function MyCell2(props){
    let menu;
    menu = (
      <Menu>
          <ColorMenu onColorMenuClick={props.onColorMenuClick}/>
          {props.color &&
              <MenuItem icon={"eraser"} text={"Unmark"} onClick={props.onMenuClick.bind(null, "eraser")}/>
          }
          <MenuItem icon={"remove"} text={"Hide similar Rows"} onClick={props.onMenuClick.bind(null, "remove")}/>
      </Menu>
    );
    return (
        <Popover content={menu}
                 position={Position.BOTTOM_RIGHT}
                 autoFocus={false} lazy={true}
                 targetTagName={"div"}
                 wrapperTagName={"div"}>
            <div className={"table-cell"} style={{backgroundColor: props.color}}>
                <div className={"hoverOverlay"}/>
                {props.value}
            </div>
        </Popover>
    );
}

class MaTable extends Component {
    constructor(props) {
        super(props);
        // dependencies of table columns
        this.key_dependencies = {Name: ["Class"], State: ["Name", "Class"]};
        // ref popover show hidden rows
        this.hiddenRowTableRef = React.createRef();
        // contains all table entries
        this.table_content = MaTable.getTableContent();

        this.state = ({
            // contains information about which cells are marked
            color: {},
            // contains information about which cells were hidden (content signature)
            removedCells:{},
            // contains all table entris not hidden by the user; this list gets rendered by <Table>
            table_render_content: this.table_content.slice(),
        });

        this.setValueWithDependencies = this.setValueWithDependencies.bind(this);
        this.getValueWithDependencies = this.getValueWithDependencies.bind(this);
        this.handleColorMenuClick = this.handleColorMenuClick.bind(this);
        this.handleMenuClick = this.handleMenuClick.bind(this);
        this._renderColumns = this._renderColumns.bind(this);
        this._cellRenderer = this._cellRenderer.bind(this);
        this._miscCellRenderer = this._miscCellRenderer.bind(this);
        this._handleRemoveSpecificRow = this._handleRemoveSpecificRow.bind(this);
        this._showHiddenRowsMiscRenderer = this._showHiddenRowsMiscRenderer.bind(this);
        this.isRowHidingContentTop = this.isRowHidingContentTop.bind(this);
        this.getHiddenRowCount = this.getHiddenRowCount.bind(this);
        this._handleShowMarkedRows = this._handleShowMarkedRows.bind(this);
        this._handleShowAllRows = this._handleShowAllRows.bind(this);
    }

    static getTableContent(){
        console.log("hello");
        return getTestData();
    }

    setValueWithDependencies(obj, rowData, columnName, cellData, value){
        if (!this.key_dependencies[columnName]){
            if(!obj[columnName]){
                obj[columnName] = {}
            }
            obj[columnName][cellData] = value;
        } else {
            const dependencies = this.key_dependencies[columnName].map(dependence => rowData[dependence]);
            let i = 0;
            if (!obj[columnName]){
                obj[columnName] = {}
            }
            obj = obj[columnName];
            for (i; i < dependencies.length; i++){
                if (!obj[dependencies[i]]){
                    obj[dependencies[i]] = {}
                }
                obj = obj[dependencies[i]]
            }
            obj[cellData] = value;
        }
    }

    getValueWithDependencies(obj, rowData, columnName, cellData){
        if (!this.key_dependencies[columnName]){
            if(!obj[columnName]) return undefined;
            return obj[columnName][cellData];
        }
        const dependencies = this.key_dependencies[columnName].map(dependence => rowData[dependence]);
        let i = 0;
        if (!obj[columnName]) return undefined;
        obj = obj[columnName];
        for (i; i < dependencies.length; i++){
            if (!obj[dependencies[i]]) return undefined;
            obj = obj[dependencies[i]]
        }
        return obj[cellData];
    }

    handleColorMenuClick(row, rowData, columnName, columnIndex, cellData, color){
        let colors = this.state.color;
        this.setValueWithDependencies(colors, rowData, columnName, cellData, color);
        this.setState({color: colors});
    }

    handleMenuClick(row, rowData, columnName, columnIndex, cellData, type){
        if (type === "eraser") {
            let colors = this.state.color;
            this.setValueWithDependencies(colors, rowData, columnName, cellData, undefined);
            this.setState({color: colors});
        } else if(type === "remove"){
            let table_render_content = this.state.table_render_content.slice();
            let i = table_render_content.length;
            let removedCells = this.state.removedCells;
            this.setValueWithDependencies(removedCells, rowData, columnName, cellData, 1);
            // remove rows with the same content (cellData + dependencies) from the rendered content
            while(i--){
                if (this.getValueWithDependencies(removedCells, table_render_content[i], columnName, table_render_content[i][columnName])){
                    table_render_content.splice(i, 1);
                }
            }
            this.setState({removedCells: removedCells, table_render_content: table_render_content});
        }
    }

    _handleRemoveSpecificRow(miscIndex) {
        let table_render_content = this.state.table_render_content.slice();
        let i = table_render_content.length;
        while(i--){
            if (miscIndex === table_render_content[i]["misc"]){
                table_render_content.splice(i, 1);
                break;
            }
        }
        this.setState({table_render_content});
    }

    _handleShowMarkedRows(rowIndex, miscIndex){
        let table_render_content = this.state.table_render_content.slice();
        const keys = Object.keys(this.hiddenRowTableRef.current.checked).map(value => parseInt(value, 10)).sort((a, b) => b - a);
        keys.forEach(key => {
            const tmp = miscIndex - this.getHiddenRowCount(rowIndex, miscIndex) + key;
            table_render_content.splice(rowIndex, 0, this.table_content[tmp]);
        });
        this.setState({table_render_content});
    }

    _handleShowAllRows(rowIndex, miscIndex){
        let table_render_content = this.state.table_render_content.slice();
        let tmp = miscIndex - this.getHiddenRowCount(rowIndex, miscIndex);
        for(let i = miscIndex - 1; i >= tmp; i--){
            table_render_content.splice(rowIndex, 0, this.table_content[i]);
        }
        this.setState({table_render_content});
    }

    isRowHidingContentTop(row, miscIndex){
        if (row === 0){
            return miscIndex !== 0;
        }
        return miscIndex - this.state.table_render_content[row - 1]["misc"] - 1 !== 0;
    }

    getHiddenRowCount(row, miscIndex){
        if (row === 0){
            return miscIndex;
        }
        return miscIndex - this.state.table_render_content[row - 1]["misc"] - 1;
    }

    _showHiddenRowsMiscRenderer(row, miscIndex){
        return (
            <Popover lazy={true} position={"left"}>
                <Tooltip content={"Show previously hidden rows"}>
                    <Icon icon={"chevron-up"}/>
                </Tooltip>
                <Menu>
                    <HiddenRowTable
                        ref = {this.hiddenRowTableRef}
                        width={750}
                        height={170}
                        headerHeight={20}
                        rowHeight={30}
                        rowCount={this.getHiddenRowCount(row, miscIndex)}
                        rowGetter={({ index }) => this.table_content[miscIndex - this.getHiddenRowCount(row, miscIndex) + index]}
                        rowStyle={{alignItems: "stretch"}}
                        overscanRowCount={15}
                        headerClassName={"table-cell"}
                        _cellRenderer = {this._cellRenderer}
                        table_content = {this.table_content}
                    >
                    </HiddenRowTable>
                    <MenuDivider/>
                    <MenuItem text={"Show marked rows"} onClick={this._handleShowMarkedRows.bind(null, row, miscIndex)}/>
                    <MenuItem text={"Show all rows"} onClick={this._handleShowAllRows.bind(null, row, miscIndex)}/>
                </Menu>
            </Popover>
        );
    }

    // renderer for the "normal" cells
    _cellRenderer({
        cellData,
        columnData,
        columnIndex,
        dataKey,
        isScrolling,
        rowData,
        rowIndex,
    }){
        return (
            <MyCell2 onColorMenuClick={this.handleColorMenuClick.bind(null, rowIndex, rowData, dataKey, columnIndex, cellData)}
                     onMenuClick={this.handleMenuClick.bind(null, rowIndex, rowData, dataKey, columnIndex, cellData)}
                     value={cellData}
                     color={this.getValueWithDependencies(this.state.color, rowData, dataKey, cellData)}
            />
        );
    }

    //renderer for the additional column "misc". contains some row interaction buttons and the "true" index of the row as cellData (often called "miscIndex")
    _miscCellRenderer({
        cellData,
        columnData,
        columnIndex,
        dataKey,
        isScrolling,
        rowData,
        rowIndex,
    }){
        return (
            <div className={"table-cell"}>
                <div className={"misc-overlay"}>
                    {this.isRowHidingContentTop(rowIndex, cellData) && this._showHiddenRowsMiscRenderer(rowIndex, cellData)}
                </div>
                <div className={"misc-overlay"} onClick={this._handleRemoveSpecificRow.bind(null, cellData)}>
                    <Tooltip content={"Hide this specific row"}>
                        <Icon icon={"exclude-row"}/>
                    </Tooltip>
                </div>
                <div className={"misc-overlay"}>
                    {cellData}
                </div>
            </div>
        );
    }

    static _overscanIndicesGetter({
        direction,          // One of "horizontal" or "vertical"
        cellCount,          // Number of rows or columns in the current axis
        scrollDirection,    // 1 (forwards) or -1 (backwards)
        overscanCellsCount, // Maximum number of cells to over-render in either direction
        startIndex,         // Begin of range of visible cells
        stopIndex           // End of range of visible cells
    }) {
        return {
            overscanStartIndex: Math.max(0, startIndex - overscanCellsCount),
            overscanStopIndex: Math.min(cellCount - 1, stopIndex + overscanCellsCount)
        }
    }

    _renderColumns(list, columnWidth){
        let keys = Object.keys(list[0]);
        let tableColumns = keys.splice(0, keys.length - 1).map(column => (
            <Column
                key={column}
                label={column}
                dataKey={column}
                width={columnWidth}
                cellRenderer={this._cellRenderer}
            />
        ));
        tableColumns.push((
            <Column key={"misc"} label={""} dataKey={"misc"} width={70} cellRenderer={this._miscCellRenderer}/>
        ));
        return (
            tableColumns
        )
    }

    render() {
        return (
            <AutoSizer>
                {({ height, width }) => (
                    <Table
                        id={"test"}
                        width={width}
                        height={height}
                        headerHeight={20}
                        rowHeight={30}
                        rowCount={this.state.table_render_content.length}
                        rowGetter={({ index }) => this.state.table_render_content[index]}
                        rowStyle={{alignItems: "stretch"}}
                        overscanRowCount={25}
                        scrollToIndex={this.props.scrollToIndex}
                        onScroll={this.props.onScroll}
                        overscanIndicesGetter={MaTable._overscanIndicesGetter}
                    >
                        {this._renderColumns(this.state.table_render_content, 250)}
                    </Table>
                )}
            </AutoSizer>
        );
    }
}

// Component enthält das Menü und die Tabelle und ermöglicht so die Synchronisation beider Elemente
class WindmillView extends Component {
    constructor(props){
        super(props);
        this.state = {
            scrollToIndex: undefined
        };
        this.tmp = 0;
        this._handleScrollToRow = this._handleScrollToRow.bind(this);
        this._handleScroll = this._handleScroll.bind(this);
    }

    _handleScrollToRow() {
        //let scrollToIndex = this.tmp++;
        let scrollToIndex = 0;
        this.setState({scrollToIndex});
    }

    // nötig, damit sequenzielle Aufrufe von _handleScrollToRow mit demselben Index ein rerender auslösen
    _handleScroll() {
        let scrollToIndex = this.state.scrollToIndex;
        if (scrollToIndex !== undefined){
            this.setState({scrollToIndex: undefined});
        }
    }

    render() {
        return (
            <div className={"windmill-view-container"}>
                <div className={"windmill-view-menu-container"}>
                    <button onClick={this._handleScrollToRow}>
                        click me
                    </button>
                </div>
                <div className={"windmill-view-table-container"}>
                    <MaTable scrollToIndex={this.state.scrollToIndex} onScroll={this._handleScroll}/>
                </div>
            </div>
        );
    }
}

class App extends Component {
    render() {
        return (
            <div className="App">
                <WindmillView/>
            </div>
        );
    }
}

export default App;
