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
        this.state = ({
            color: {},
            removedRows: {},
            removedCells:{},
            removedRowsBlocks: {},
        });
        this.key_dependencies = {Name: ["Class"], State: ["Name", "Class"]};
        this.table_content = MaTable.getTableContent();
        this.table_render_content = this.table_content.slice();
        this.hiddenRowTableRef = React.createRef();

        this.setValueWithDependencies = this.setValueWithDependencies.bind(this);
        this.getValueWithDependencies = this.getValueWithDependencies.bind(this);
        this.handleColorMenuClick = this.handleColorMenuClick.bind(this);
        this.handleMenuClick = this.handleMenuClick.bind(this);
        this._renderColumns = this._renderColumns.bind(this);
        this._cellRenderer = this._cellRenderer.bind(this);
        this._miscCellRenderer = this._miscCellRenderer.bind(this);
        this._handleRemoveSpecificRow = this._handleRemoveSpecificRow.bind(this);
        this._hide_row = this._hide_row.bind(this);
        this._showHiddenRowsMiscRenderer = this._showHiddenRowsMiscRenderer.bind(this);

        this._handleClickTest = this._handleClickTest.bind(this);
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
            let removedCells = this.state.removedCells;
            let table_render_content = this.table_render_content;
            let i = table_render_content.length;
            this.setValueWithDependencies(removedCells, rowData, columnName, cellData, 1);
            // remove rows with the same content (cellData + dependencies) from the rendered content
            while(i--){
                if (this.getValueWithDependencies(removedCells, table_render_content[i], columnName, table_render_content[i][columnName])){
                    this._hide_row(i, table_render_content[i]["misc"]);
                }
            }
            this.setState({removedCells: removedCells});
        }
    }

    _hide_row(row, miscIndex) {
        let blocks = this.state.removedRowsBlocks;
        let table_render_content = this.table_render_content;

        if (row < table_render_content.length - 1){
            if (!blocks[miscIndex]){
                if (blocks[table_render_content[row + 1].misc]){
                    --blocks[table_render_content[row + 1].misc].lower;
                } else {
                    blocks[table_render_content[row + 1].misc] = {lower: miscIndex, upper: miscIndex + 1};
                }
            } else {
                if (blocks[table_render_content[row + 1].misc]){
                    blocks[table_render_content[row + 1].misc].lower = blocks[miscIndex].lower;
                } else {
                    blocks[table_render_content[row + 1].misc] = {lower: blocks[miscIndex].lower, upper: miscIndex + 1};
                }
                delete blocks[miscIndex];
            }
        } else {
            if (!blocks[miscIndex]){
                if (blocks[table_render_content[row - 1].misc]){
                    blocks[table_render_content[row - 1].misc].tail = {lower: miscIndex, upper: miscIndex + 1}
                } else {
                    blocks[table_render_content[row - 1].misc] = {tail: {lower: miscIndex, upper: miscIndex + 1}}
                }
            } else {
                if (blocks[table_render_content[row - 1].misc]){
                    blocks[table_render_content[row - 1].misc].tail = {lower: miscIndex, upper: blocks[miscIndex].upper}
                } else {
                    blocks[table_render_content[row - 1].misc] = {tail: {lower: miscIndex, upper: blocks[miscIndex].upper}}
                }
                delete blocks[miscIndex];
            }
        }
        table_render_content.splice(row, 1);
    }


    _handleRemoveSpecificRow(miscIndex) {
        let removedRows = this.state.removedRows;
        removedRows[miscIndex] = 1;
        // remove row with miscIndex (cellData of column misc) from the rendered content
        let table_render_content = this.table_render_content;
        let i = table_render_content.length;
        while(i--){
            if (miscIndex === table_render_content[i]["misc"]){
                this._hide_row(i, miscIndex);
                break;
            }
        }
        this.setState({removedRows: removedRows});
    }

    _handleClickTest(miscIndex){
        const keys = Object.keys(this.hiddenRowTableRef.current.checked);
        keys.forEach(key => {
            const rowIndex = parseInt(this.state.removedRowsBlocks[miscIndex].lower, 10) + parseInt(key, 10);
            if (!isNaN(rowIndex)){
                //todo
            }
        });
    }

    _showHiddenRowsMiscRenderer(miscIndex){
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
                        rowCount={this.state.removedRowsBlocks[miscIndex].upper - this.state.removedRowsBlocks[miscIndex].lower}
                        rowGetter={({ index }) => this.table_content[index + this.state.removedRowsBlocks[miscIndex].lower]}
                        rowStyle={{alignItems: "stretch"}}
                        overscanRowCount={15}
                        headerClassName={"table-cell"}
                        _cellRenderer = {this._cellRenderer}
                        table_content = {this.table_content}
                    >
                    </HiddenRowTable>
                    <MenuDivider/>
                    <MenuItem text={"Show marked rows"} onClick={this._handleClickTest.bind(null, miscIndex)}/>
                    <MenuItem text={"Show all rows"}/>
                </Menu>
            </Popover>
        );
    }

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
                    {this.state.removedRowsBlocks[cellData] && this._showHiddenRowsMiscRenderer(cellData)}
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
                        rowCount={this.table_render_content.length}
                        rowGetter={({ index }) => this.table_render_content[index]}
                        rowStyle={{alignItems: "stretch"}}
                        overscanRowCount={25}
                        scrollToIndex={this.props.scrollToIndex}
                        onScroll={this.props.onScroll}
                        overscanIndicesGetter={MaTable._overscanIndicesGetter}
                    >
                        {this._renderColumns(this.table_render_content, 250)}
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
