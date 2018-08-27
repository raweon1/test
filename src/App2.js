import React, {Component} from 'react';
import './App.css';
import {Tab, Tabs, Tooltip, Menu, MenuDivider, MenuItem, Popover, Position, Icon, Colors, Button, Navbar, NavbarGroup} from '@blueprintjs/core'
import {DatePicker, DateRangePicker} from "@blueprintjs/datetime"
import {Table, Column, AutoSizer} from "react-virtualized";

import {dayPickerClassNames} from "./DayPickerClassNames"
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

function EventTableCell(props){
    const menu = (
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

class HiddenRowTable extends Component {
    constructor(props) {
        super(props);
        this.checked = {};

        this.columnWidths = [200, 190, 190, 70, 40];

        this.handleChange = this.handleChange.bind(this);
        this.cellRenderer = this.cellRenderer.bind(this);
        this.showHiddenRowsTableColumnRenderer = this.showHiddenRowsTableColumnRenderer.bind(this);
    }

    handleChange(rowIndex, event){
        if (event.target.checked) this.checked[rowIndex] = true;
        else if (this.checked[rowIndex]) delete this.checked[rowIndex];
    }

    cellRenderer({
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
                <input type={"checkbox"} defaultChecked={this.checked[rowIndex] ? this.checked[rowIndex] : false} onChange={this.handleChange.bind(this, rowIndex)}/>
            </div>
        );
    }

    showHiddenRowsTableColumnRenderer(columnNames){
        let tableColumns = columnNames.map((column, index) => (
            <Column
                key={column}
                label={column}
                dataKey={column}
                width={this.columnWidths[index]}
                cellRenderer={this.props.cellRenderer}
                style={this.props.cellStyle}
            />
        ));
        tableColumns.push(
            <Column
                key={"misc"}
                dataKey={"misc"}
                width={this.columnWidths[this.columnWidths.length - 1]}
                cellRenderer={this.cellRenderer}
                style={this.props.cellStyle}
            />
        );
        return (
            tableColumns
        );
    }

    render(){
        return (
            <Table
                id={"show-hidden-rows-table"}
                headerStyle={this.props.headerStyle}
                width={this.props.width}
                height={this.props.height}
                headerHeight={this.props.headerHeight}
                rowHeight={this.props.rowHeight}
                rowCount={this.props.rowCount}
                rowGetter={this.props.rowGetter}
                rowStyle={this.props.rowStyle}
                overscanRowCount={this.props.overscanRowCount}
                headerClassName={this.props.headerClassName}
            >
                {this.showHiddenRowsTableColumnRenderer(this.props.columnNames)}
            </Table>
        );
    }
}

class EventTable extends Component {
    constructor(props) {
        super(props);

        this.tableRef = React.createRef();
        // scrollToDate will scroll to an index i - scrollOffset
        this.scrollOffset = 2;
        this.columnWidth = 250;

        this.scrollToDate = this.scrollToDate.bind(this);
        this.renderColumns = this.renderColumns.bind(this);
    }

    scrollToDate(date){
        if (date === null) return;
        let tableRenderContent = this.props.tableRenderContent;
        for (let i = 0; i < tableRenderContent.length; i++){
            let tmp_date = new Date(tableRenderContent[i]["Timestamp"]);
            if (tmp_date >= date){
                this.tableRef.current.scrollToRow(Math.max(0, i - this.scrollOffset));
                return;
            }
        }
    }

    renderColumns(columnNames, columnWidth){
        let tableColumns = columnNames.map(column => (
            <Column
                key={column}
                label={column}
                dataKey={column}
                width={columnWidth}
                cellRenderer={this.props.cellRenderer}
                style={this.cellStyle}
            />
        ));
        tableColumns.push((
            <Column
                key={"misc"}
                label={""}
                dataKey={"misc"}
                width={120}
                cellRenderer={this.props.miscCellRenderer}
                style={this.cellStyle}/>
        ));
        return (tableColumns)
    }

    static overscanIndicesGetter({direction, cellCount, scrollDirection, overscanCellsCount, startIndex, stopIndex}) {
        return {
            overscanStartIndex: Math.max(0, startIndex - overscanCellsCount),
            overscanStopIndex: Math.min(cellCount - 1, stopIndex + overscanCellsCount)
        }
    }

    render() {
        return (
            <AutoSizer>
                {({ height, width }) => (
                    <Table
                        ref={this.tableRef}
                        headerStyle={this.props.headerStyle}
                        width={width}
                        height={height}
                        headerHeight={this.props.headerHeight}
                        rowHeight={this.props.rowHeight}
                        rowCount={this.props.tableRenderContent.length}
                        rowGetter={({ index }) => this.props.tableRenderContent[index]}
                        rowStyle={this.props.rowStyle}
                        scrollToAlignment={"start"}
                        overscanRowCount={this.props.overscanCount}
                        overscanIndicesGetter={EventTable.overscanIndicesGetter}
                    >
                        {this.renderColumns(this.props.columnNames, this.columnWidth)}
                    </Table>
                )}
            </AutoSizer>
        );
    }
}

class WindmillView extends Component {
    constructor(props){
        super(props);

        this.tableContent = getTestData();
        this.dataRange = [
            new Date(this.table_content[0]["Timestamp"]),
            new Date(this.table_content[this.table_content.length - 1]["Timestamp"])
        ];
        // dependencies of table columns
        this.key_dependencies = {Name: ["Class"], State: ["Name", "Class"]};
         // which color to choose for the background of a cell if no color is specified, first element has highest priority
        this.key_color_hierarchie = ["Class", "Name", "State", "HexCode", "Timestamp"];
        // this.key_color_hierarchie = ["State", "Name", "Class", "HexCode", "Timestamp"];
        this.columnNames = ["Timestamp", "Class", "Name", "State", "HexCode"];

        this.headerHeight = 30;
        this.rowHeight = 30;
        this.overscanCount = 25;
        this.headerStyle = {margin: "0px"};
        this.rowStyle = {alignItems: "stretch", padding: "0 0 0 0px"};
        this.cellStyle = {margin: "0px"};
        this.hiddenRowsTableWidth = 750;
        this.hiddenRowsTableHeight = 170;

        this.state = {
            color: {},
            removedCells: {},
            tableRenderContent: this.tableContent.slice(),
            filterRange: this.dataRange,
        };

        this.tableRef = React.createRef();
        this.hiddenRowsTableRef = React.createRef();

        this.setValueWithDependencies = this.setValueWithDependencies.bind(this);
        this.getValueWithDependencies = this.getValueWithDependencies.bind(this);
        this.getCellColor = this.getCellColor.bind(this);
        this.getHiddenRowCount = this.getHiddenRowCount.bind(this);
        this.getHiddenRowCountTail = this.getHiddenRowCountTail.bind(this);
        this.isRowHidingContentTop = this.isRowHidingContentTop.bind(this);
        this.isRowHidingContentTail = this.isRowHidingContentTail.bind(this);
        this.handleRemoveSpecificRow = this.handleRemoveSpecificRow.bind(this);
        this.handleShowMarkedSpecificRows = this.handleShowMarkedSpecificRows.bind(this);
        this.handleShowAllSpecificRows = this.handleShowAllSpecificRows.bind(this);
        this.handleShowMarkedSpecificRowsTail = this.handleShowMarkedSpecificRowsTail.bind(this);
        this.handleShowAllSpecificRowsTail =this. handleShowAllSpecificRowsTail.bind(this);
        this.handleColorMenuClick = this.handleColorMenuClick.bind(this);
        this.handleCellMenuClick = this.handleCellMenuClick.bind(this);
        this.cellRenderer = this.cellRenderer.bind(this);
        this.hiddenRowsPopoverRenderer = this.hiddenRowsPopoverRenderer.bind(this);
        this.hiddenRowsPopoverRendererTail = this.hiddenRowsPopoverRendererTail.bind(this);
        this.miscCellRenderer = this.miscCellRenderer.bind(this);
    }

    setValueWithDependencies(obj, rowData, columnName, value){
        const cellData = rowData[columnName];
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

    getValueWithDependencies(obj, rowData, columnName){
        const cellData = rowData[columnName];
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

    getCellColor(rowData, dataKey){
        let color = this.getValueWithDependencies(this.state.color, rowData, dataKey);
        if (color) return {color: color, source: dataKey};
        for (let i = 0; i < this.key_color_hierarchie.length; i++){
            let dataKey = this.key_color_hierarchie[i];
            color = this.getValueWithDependencies(this.state.color, rowData, dataKey);
            if (color !== undefined) return {color: color, source: dataKey};
        }
        return {color: undefined, source: undefined};
    }

    getHiddenRowCount(row, miscIndex){
        if (row === 0){
            return miscIndex;
        }
        return miscIndex - this.state.tableRenderContent[row - 1]["misc"] - 1;
    }

    getHiddenRowCountTail(rowIndex, miscIndex){
        const tableRenderContent = this.state.tableRenderContent;
        if (rowIndex === tableRenderContent.length - 1){
            return (this.tableContent.length - 1) - miscIndex;
        }
        // we only want to show tail hidden rows on the last row
        return 0;
        // return this.state.tableRenderContent[rowIndex + 1]["misc"] - miscIndex - 1;
    }

    isRowHidingContentTop(row, miscIndex){
        if (row === 0){
            return miscIndex !== 0;
        }
        return miscIndex - this.state.tableRenderContent[row - 1]["misc"] - 1 !== 0;
    }

    isRowHidingContentTail(rowIndex, miscIndex){
        const tableRenderContent = this.state.tableRenderContent;
        if (rowIndex === tableRenderContent.length - 1){
            return miscIndex !== this.tableContent.length - 1;
        }
        // we only want to show tail hidden rows on the last row
        return false;
        // return this.state.tableRenderContent[rowIndex + 1]["misc"] - miscIndex - 1 !== 0;
    }

    handleRemoveSpecificRow(miscIndex) {
        let tableRenderContent = this.state.tableRenderContent.slice();
        let i = tableRenderContent.length;
        while(i--){
            if (miscIndex === tableRenderContent[i]["misc"]){
                tableRenderContent.splice(i, 1);
                break;
            }
        }
        this.setState({tableRenderContent});
    }

    handleShowMarkedSpecificRows(rowIndex, miscIndex){
        let tableRenderContent = this.state.tableRenderContent.slice();
        const keys = Object.keys(this.hiddenRowsTableRef.current.checked).map(value => parseInt(value, 10)).sort((a, b) => b - a);
        keys.forEach(key => {
            const tmp = miscIndex - this.getHiddenRowCount(rowIndex, miscIndex) + key;
            tableRenderContent.splice(rowIndex, 0, this.tableContent[tmp]);
        });
        this.setState({tableRenderContent: tableRenderContent});
    }

    handleShowAllSpecificRows(rowIndex, miscIndex){
        let tableRenderContent = this.state.tableRenderContent.slice();
        let tmp = miscIndex - this.getHiddenRowCount(rowIndex, miscIndex);
        for(let i = miscIndex - 1; i >= tmp; i--){
            tableRenderContent.splice(rowIndex, 0, this.tableContent[i]);
        }
        this.setState({tableRenderContent: tableRenderContent});
    }

    handleShowMarkedSpecificRowsTail(rowIndex, miscIndex){
        let tableRenderContent = this.state.tableRenderContent.slice();
        const keys = Object.keys(this.hiddenRowsTableRef.current.checked).map(value => parseInt(value, 10)).sort((a, b) => b - a);
        keys.forEach(key => {
            const tmp = miscIndex + 1 + key;
            tableRenderContent.splice(rowIndex + 1, 0, this.tableContent[tmp]);
        });
        this.setState({tableRenderContent: tableRenderContent});
    }

    handleShowAllSpecificRowsTail(rowIndex, miscIndex){
        let tableRenderContent = this.state.tableRenderContent.slice();
        for(let i = this.tableContent.length - 1; i > miscIndex; i--){
            tableRenderContent.splice(rowIndex + 1, 0, this.tableContent[i]);
        }
        this.setState({tableRenderContent: tableRenderContent});
    }

    handleColorMenuClick(row, rowData, columnName, columnIndex, cellData, color){
        let colors = this.state.color;
        this.setValueWithDependencies(colors, rowData, columnName, color);
        this.setState({color: colors});
    }

    handleCellMenuClick(row, rowData, dataKey, columnIndex, cellData, type){
        if (type === "eraser") {
            let colors = this.state.color;
            const cellColor = this.getCellColor(rowData, dataKey);
            // remove color should only be visible on marked rows. If is redudndant
            if (cellColor.color){
                this.setValueWithDependencies(colors, rowData, cellColor.source, undefined);
                this.setState({color: colors})
            }
        } else if(type === "remove"){
            let tableRenderContent = this.state.tableRenderContent.slice();
            let i = tableRenderContent.length;
            let removedCells = this.state.removedCells;
            this.setValueWithDependencies(removedCells, rowData, dataKey, 1);
            // remove rows with the same content (cellData + dependencies) from the rendered content
            while(i--){
                if (this.getValueWithDependencies(removedCells, tableRenderContent[i], dataKey)){
                    tableRenderContent.splice(i, 1);
                }
            }
            this.setState({removedCells: removedCells, table_render_content: tableRenderContent});
        }
    }

    cellRenderer({cellData, columnData, columnIndex, dataKey, isScrolling, rowData, rowIndex}){
        return (
            <EventTableCell
                onColorMenuClick={this.handleColorMenuClick.bind(null, rowIndex, rowData, dataKey, columnIndex, cellData)}
                onMenuClick={this.handleCellMenuClick.bind(null, rowIndex, rowData, dataKey, columnIndex, cellData)}
                value={cellData}
                color={this.getCellColor().color}
            />
        );
    }

    hiddenRowsPopoverRenderer(row, miscIndex){
        return (
            <Popover lazy={true} position={"left"}>
                <Tooltip content={"Show previously hidden rows"}>
                    <Icon icon={"chevron-up"}/>
                </Tooltip>
                <Menu>
                    <HiddenRowTable
                        ref = {this.hiddenRowsTableRef}
                        width={this.hiddenRowsTableWidth}
                        height={this.hiddenRowsTableHeight}
                        headerStyle={this.headerStyle}
                        headerHeight={this.headerHeight}
                        rowHeight={this.rowHeight}
                        rowCount={this.getHiddenRowCount(row, miscIndex)}
                        rowGetter={({ index }) => this.tableContent[miscIndex - this.getHiddenRowCount(row, miscIndex) + index]}
                        rowStyle={this.rowStyle}
                        cellStyle={this.cellStyle}
                        overscanRowCount={this.overscanCount}
                        headerClassName={"table-cell"}
                        cellRenderer = {this.cellRenderer}
                        columnNames = {this.columnNames.splice(0, this.columnNames.length - 2)}
                    >
                    </HiddenRowTable>
                    <MenuDivider/>
                    <MenuItem text={"Show marked rows"} onClick={this.handleShowMarkedSpecificRows.bind(null, row, miscIndex)}/>
                    <MenuItem text={"Show all rows"} onClick={this.handleShowAllSpecificRows.bind(null, row, miscIndex)}/>
                </Menu>
            </Popover>
        );
    }

    hiddenRowsPopoverRendererTail(rowIndex, miscIndex){
        return (
            <Popover lazy={true} position={"left"}>
                <Tooltip content={"Show previously hidden rows"}>
                    <Icon icon={"chevron-down"}/>
                </Tooltip>
                <Menu>
                    <HiddenRowTable
                        ref = {this.hiddenRowsTableRef}
                        width={this.hiddenRowsTableWidth}
                        height={this.hiddenRowsTableHeight}
                        headerStyle={this.headerStyle}
                        headerHeight={this.headerHeight}
                        rowHeight={this.rowHeight}
                        rowCount={this.getHiddenRowCountTail(rowIndex, miscIndex)}
                        rowGetter={({ index }) => this.table_content[miscIndex + 1 + index]}
                        rowStyle={this.rowStyle}
                        cellStyle={this.cellStyle}
                        overscanRowCount={this.overscanCount}
                        headerClassName={"table-cell"}
                        cellRenderer = {this.cellRenderer}
                        columnNames = {this.columnNames.splice(0, this.columnNames.length - 2)}
                    >
                    </HiddenRowTable>
                    <MenuDivider/>
                    <MenuItem text={"Show marked rows"} onClick={this.handleShowMarkedSpecificRowsTail.bind(null, rowIndex, miscIndex)}/>
                    <MenuItem text={"Show all rows"} onClick={this.handleShowAllSpecificRowsTail.bind(null, rowIndex, miscIndex)}/>
                </Menu>
            </Popover>
        );
    }

    miscCellRenderer({cellData, columnData, columnIndex, dataKey, isScrolling, rowData, rowIndex}){
        return (
            <div className={"table-cell"}>
                <div className={"misc-overlay"}>
                    {this.isRowHidingContentTop(rowIndex, cellData) && this.hiddenRowsPopoverRenderer(rowIndex, cellData)}
                </div>
                <div className={"misc-overlay"} onClick={this.handleRemoveSpecificRow.bind(null, cellData)}>
                    <Tooltip content={"Hide this specific row"}>
                        <Icon icon={"exclude-row"}/>
                    </Tooltip>
                </div>
                <div className={"misc-overlay"}>
                    {this.isRowHidingContentTail(rowIndex, cellData) && this.hiddenRowsPopoverRendererTail(rowIndex, cellData)}
                </div>
                <div className={"misc-overlay"}>
                    {cellData}
                </div>
            </div>
        );
    }

    render() {
        const reactDayPickerProps = {classNames: dayPickerClassNames};
        return (
            <div className={"windmill-view-container"}>
                <Navbar>
                    <NavbarGroup>
                        <Popover position={"bottom"} lazy={true}>
                            <Button>
                                Filter
                            </Button>
                            <DateRangePicker
                                shortcuts={false}
                                minDate={this.dataRange[0]}
                                maxDate={this.dataRange[1]}
                                onChange={selectedDates => {
                                    if (selectedDates[0] !== null) selectedDates[0].setHours(0);
                                    if (selectedDates[1] !== null) selectedDates[1].setHours(0);
                                    this.tableRef.current.filterDates(selectedDates[0], selectedDates[1]);
                                }}/>
                        </Popover>
                        <Popover position={"bottom"} lazy={true}>
                            <Button>
                                ScrollTo
                            </Button>
                            <DatePicker
                                dayPickerProps={reactDayPickerProps}
                                minDate={this.foo}
                                maxDate={this.foobar}
                                onChange={selectedDate => {
                                    if (selectedDate === null) return;
                                    selectedDate.setHours(0);
                                    this.tableRef.current.scrollToDate(selectedDate);
                                }}
                            />
                        </Popover>
                        <Popover>
                            <Button>
                                Hello World
                            </Button>
                        </Popover>
                    </NavbarGroup>
                </Navbar>
                <div className={"windmill-view-table-container"}>
                    <EventTable
                        ref={this.tableRef}
                        headerHeight={this.headerHeight}
                        rowHeight={this.rowHeight}
                        overscanCount={this.overscanCount}
                        headerStyle={this.headerStyle}
                        rowStyle={this.rowStyle}
                        cellStyle={this.cellStyle}
                        filterRange={this.state.filterRange}
                        tableRenderContent={this.state.tableRenderContent}
                        columnNames={this.columnNames}
                        cellRenderer={this.cellRenderer}
                        miscCellRenderer={this.miscCellRenderer}
                    />
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
