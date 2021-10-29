import React, { useCallback, useEffect, useRef, useState } from "react"
// import { SDKBox } from "../../../contextProxy"
// import "./VirtualList.scss"

export interface IVirtualListRowRenderProps<T> {
    index: number
    item: T
    style: React.CSSProperties
}

export interface IVirtualListProps<T> {
    id?: string
    className?: string
    rowHeight?: number // 每行的高度
    height: number // 滚动列表高度
    bufferSize?: number
    list: T[] // 数据
    width: string 
    onLoadData?: () => void // 滚动到底部加载数据
    onScroll?: () => void // 滚动回调
    rowRender?: (data: IVirtualListRowRenderProps<T>) => React.ReactNode // 渲染每行节点
}

export interface IDefaultState<T> {
    total: number
    height: number
    rowHeight: number
    bufferSize: number
    limit: number
    originStartIdx: number
    startIndex: number
    endIndex: number
    timer?: NodeJS.Timer
    onLoadData?: () => void
    onScroll?: (e?: HTMLDivElement) => void
}

// 虚拟列表
export function VirtualList<T>(props: IVirtualListProps<T>): JSX.Element {
    const { id, className = "", height, list, width, rowHeight = 56, bufferSize = 30, onLoadData, rowRender } = props
    
    const instance = useRef<IDefaultState<T>>({
        total: 0, height: 0, rowHeight: 56,
        bufferSize: 30, limit: 0,
        originStartIdx: 0,
        startIndex: 0, endIndex: 0,
        timer: null,
        onLoadData,
        onScroll: props.onScroll
    })
    const scrollContainer = useRef<HTMLDivElement>(null)
    const [totalHeight, setTotalHeight] = useState<number>(0)
    const [scrollTop, setScrollTop] = useState<number>(0)
    useEffect(() => {
        instance.current.bufferSize = bufferSize
    }, [bufferSize])
    useEffect(() => {
        instance.current.rowHeight = rowHeight
    }, [rowHeight])
    useEffect(() => {
        instance.current.onScroll = props.onScroll
    }, [props.onScroll])
    useEffect(() => {
        instance.current.onLoadData = onLoadData
    }, [onLoadData])
    useEffect(() => {
        if (!height) 
            return
        const { originStartIdx } = instance.current
        const { rowHeight, bufferSize, total } = instance.current
        const limit = Math.ceil(height / rowHeight)
        const startIndex = Math.max(originStartIdx - bufferSize, 0)
        instance.current.limit = limit
        instance.current.startIndex = startIndex
        // 初始化后，窗口放大or缩小了，高度改变，重置
        if (instance.current.height && instance.current.height !== height) {
            // originStartIdx = 0
            // const endIndex = Math.min(
            //     originStartIdx + limit + bufferSize,
            //     total - 1
            // )
            // instance.current.endIndex = endIndex
            const { scrollTop } = scrollContainer.current
            const currIndex = Math.floor(scrollTop / rowHeight)
            instance.current.originStartIdx = currIndex
            instance.current.startIndex = Math.max(currIndex - bufferSize, 0)
            instance.current.endIndex = Math.min(currIndex + limit + bufferSize, total - 1)
            // 执行更新
            setScrollTop(scrollTop => {
                return scrollTop + 1
            })
        }
        instance.current.height = height
    }, [height])

    useEffect(() => {
        const { originStartIdx, bufferSize, limit } = instance.current
        const total = list.length
        // if (oldTotal === total) 
        //     return
        const endIndex = Math.min(
            originStartIdx + limit + bufferSize,
            total - 1
        )
        instance.current.endIndex = endIndex
        instance.current.total = total
        setTotalHeight(total * instance.current.rowHeight)
    }, [list])

    // 渲染每行
    const renderRow = useCallback((data: IVirtualListRowRenderProps<T>) => {
        return typeof rowRender === "function" && rowRender(data)
    }, [rowRender])

    // 滚动事件
    const onScroll = useCallback((e) => {
        if (e.target === scrollContainer.current) {
            const { clientHeight, scrollHeight, scrollTop } = e.target
            const { total, rowHeight, limit, originStartIdx, bufferSize, onLoadData, onScroll } = instance.current
            const currIndex = Math.floor(scrollTop / rowHeight)

            // 执行滚动回调
            if (typeof onScroll === "function") {
                onScroll(e)
            }
            // console.log("VirtualList.tsx onScroll", originStartIdx, currIndex)
            // 滚动到底部了,触发滚动回调，加载数据
            if (scrollTop + clientHeight >= scrollHeight && typeof onLoadData === "function") {
                onLoadData()
            }
            if (originStartIdx !== currIndex) {
                instance.current.originStartIdx = currIndex
                instance.current.startIndex = Math.max(currIndex - bufferSize, 0)
                instance.current.endIndex = Math.min(currIndex + limit + bufferSize, total - 1)
                // 执行更新
                setScrollTop(scrollTop)
            }
        }
    }, [])

    // 渲染显示的内容
    const renderDisplayContent = useCallback((list: T[]) => {
        const { rowHeight, startIndex, endIndex } = instance.current
        const content: React.ReactNode[] = []
        if (list.length === 0) 
            return content
        for (let i = startIndex; i <= endIndex; ++i) {
            const data: IVirtualListRowRenderProps<T> = {
                index: i,
                item: list[i],
                style: {
                    height: `${rowHeight - 1  }px`,
                    lineHeight: `${rowHeight  }px`,
                    left: 0,
                    right: 0,
                    position: "absolute",
                    top: i * rowHeight,
                    width
                }
            }
            const row = renderRow(data)
            content.push(row)
        }
        // SDKBox.get().logger.debug({
        //     module: 'ChatListWrapper VirtualList.tsx',
        //     method: 'renderDisplayContent',
        //     message: 'renderDisplayContent: data = ',
        //     data: {
        //         ...instance,
        //         listLength: list.length
        //     }
        // })
        return content
    }, [width])

    return (
        <div
            id={id}
            ref={scrollContainer}
            className={`virtual-list ${className}`}
            style={{
                overflowX: "hidden",
                overflowY: "auto",
                height
            }}
            onScroll={onScroll}
        >
            <div style={{ height: totalHeight, position: "relative" }} data-scrollTop={scrollTop}>
                {renderDisplayContent(list)}
            </div>
        </div>
    )
}

{/* 虚拟列表 */}
                {
                    <VirtualList<IChatInfo> 
                        id={instance.current.chatVirtualListId} 
                        height={height} 
                        list={chatList} 
                        onLoadData={getChatList} 
                        rowHeight={instance.current.rowHeight} 
                        bufferSize={bufferSize}
                        width={chatListPanelStyle.width}
                        rowRender={(data) => {
                            const { index, style, item: chatInfo } = data
                            const { top, width } = style
                            
                            if (!chatInfo) 
                                return <></>
                            return <ChatView
                                key={index}
                                chatInfo={chatInfo}
                                onClick={onChatClick}
                                index={index}
                                style={{ top, width }}
                                className={"virtual"}
                            />
                        }}
                    />
                }

// 废弃（思路类似于蜜蜂、空间，有bug）
// export function ReactVirtualList<T>(props: IVirtualListProps<T>): JSX.Element {
//     const { id, className = "", height, list, width, rowHeight = 56, bufferSize = 10, onLoadData, rowRender } = props
//     const scrollContainer = useRef<HTMLDivElement>(null)
//     const instance = useRef({
//         height,
//         containerHeight: 0,
//         rowHeight,
//         perCount: 0,
//         maxRowCount: 0,
//         rowCount: 0,
//         totalCount: 0,
//         startIndex: 0,
//         endIndex: 0,
//         totalHeight: 0,
//         contentHeight: 0,
//         headerDOM: null,
//         contentDOM: null,
//         footerDOM: null,
//         beginPosition: 0,
//         endPosition: 0,
//         needReloadWhenScroll: false,
//         needUpdateView: false,
//         listScrollTop: 0,
//         list: []
//     })
//     const headerDOM = useRef()
//     const contentDOM = useRef()
//     const footerDOM = useRef()
//     const [heightWrapper, setHeightWrapper] = useState({
//         header: 0,
//         content: 0,
//         footer: 0,
//         total: 0
//     })
//     const [time, setTime] = useState(0)

//     useEffect(() => {
//         instance.current.height = height
//         initListView()
//         showListView()
//     }, [height])

//     useEffect(() => {
//         instance.current.rowHeight = rowHeight
//     }, [rowHeight])

//     // useEffect(() => {
//     //     scrollContainer.current.scrollTop = heightWrapper.header
//     // }, [heightWrapper.header])

//     useEffect(() => {
//         const containerHeight = $(".layout-container").height()
//         instance.current.containerHeight = containerHeight
//         const perCount = Math.floor(containerHeight / rowHeight)
//         instance.current.perCount = perCount
//     }, [])

//     useEffect(() => {
//         let flag = false
//         if (instance.current.list.length !== list.length) {
//             flag = true
//         }
//         instance.current.list = list
//         if (flag) {
//             initListView()
//         }
//         showListView()
//     }, [list])

//     useEffect(() => {
//         const { header, content, footer } = heightWrapper
//         $(headerDOM.current).height(header)
//         $(contentDOM.current).height(content)
//         $(footerDOM.current).height(footer)
//     }, [heightWrapper])


//     const initListView = useCallback(() => {
//         const { rowHeight, beginPosition, list, perCount } = instance.current
//         const total = list.length
//         let _rowCount = perCount * 3
//         const needReloadWhenScroll = total && total < _rowCount
//         if (needReloadWhenScroll) {
//             _rowCount = total
//         }
//         const contentHeight =  _rowCount * rowHeight
//         const totalHeight = total * rowHeight

//         const endPosition = beginPosition + contentHeight
//         const footerHeight = totalHeight - (beginPosition + contentHeight)



//         instance.current.endIndex = _rowCount
//         instance.current.rowCount = _rowCount
//         instance.current.totalCount = total

//         instance.current.totalHeight = totalHeight
//         instance.current.contentHeight = contentHeight
//         // instance.current.h = beginPosition
//         // instance.current.
//         instance.current.needReloadWhenScroll = !needReloadWhenScroll
//         instance.current.endPosition = beginPosition + contentHeight
//         calculateStartIndex(false)
//         setHeightWrapper(height => {
//             return { ...height, total: totalHeight, content: contentHeight, header: beginPosition, footer: footerHeight }
//         })
//     }, [])

//     const calculateStartIndex = useCallback((isScroll: boolean) => {
//         const { 
//             containerHeight, rowHeight, 
//             needReloadWhenScroll, 
//             beginPosition, endPosition, 
//             rowCount, totalCount, perCount,
//             contentHeight, totalHeight,
//             listScrollTop
//         } = instance.current
//         if (needReloadWhenScroll) {
//             let scrollTop = listScrollTop
//             if (isScroll) {
//                 // eslint-disable-next-line prefer-destructuring
//                 scrollTop = scrollContainer.current.scrollTop
//             }
//             const beginIndex = Math.floor(scrollTop / rowHeight)
//             const firstShownItemOffset = scrollTop % rowHeight
//             console.log("VirtualList.tsx calculateStartIndex", scrollTop, beginIndex, firstShownItemOffset, instance)
//             if (scrollTop <= beginPosition || scrollTop + containerHeight >= endPosition) {
//                 instance.current.beginPosition = scrollTop - firstShownItemOffset - rowHeight * perCount
//                 if (instance.current.beginPosition < 0) {
//                     instance.current.beginPosition = 0
//                 }
//                 instance.current.endPosition = beginPosition + contentHeight
//                 if (instance.current.endPosition > totalHeight) {
//                     instance.current.endPosition = totalHeight
//                     instance.current.beginPosition = totalHeight - contentHeight
//                 }
//                 $(headerDOM.current).height(instance.current.beginPosition)
//                 $(footerDOM.current).height(totalHeight - instance.current.endPosition)
//                 let startIndex = beginIndex - perCount
//                 const endIndex = beginIndex + perCount
//                 if (startIndex <= 0) {
//                     startIndex = 0
//                 }
//                 if (endIndex >= totalCount - 1 || startIndex + rowCount > totalCount) {
//                     startIndex = totalCount - rowCount
//                 }
//                 if (instance.current.startIndex === startIndex && startIndex !== 0) {
//                     instance.current.needUpdateView = false
//                 } else {
//                     instance.current.needUpdateView = true
//                     instance.current.startIndex = startIndex
//                 }
//             } else {
//                 instance.current.needUpdateView = false
//             }
//         } else {
//             instance.current.beginPosition = 0
//             instance.current.endPosition = beginPosition + contentHeight
//             $(instance.current.headerDOM).height(beginPosition)
//             $(instance.current.footerDOM).height(totalHeight - endPosition)
//             instance.current.startIndex = 0
//             instance.current.needUpdateView = false
//         }
//     }, [])

//     const showListView = useCallback(() => {
//         setTime(Date.now())
//     }, [])

//     // 滚动事件
//     const onScroll = useCallback(e => {
//         if (e.target === scrollContainer.current) {
//             const { clientHeight, scrollHeight, scrollTop } = e.target
//             const { rowHeight, totalHeight, contentHeight, needReloadWhenScroll } = instance.current
//             if (scrollTop + clientHeight >= scrollHeight) {
//                 typeof onLoadData === "function" && onLoadData()
//             }
//             if (needReloadWhenScroll) {
//                 calculateStartIndex(true)
//                 showListView()
//                 // instance.current.needReloadWhenScroll = false
//             }
//             instance.current.listScrollTop = scrollTop
//             // const index = Math.ceil(scrollTop / rowHeight)
//             // if (totalHeight !== contentHeight) {
//             //     const headerHeight = scrollTop
//             //     const footerHeight = totalHeight - contentHeight - headerHeight
//             //     setHeightWrapper(height => {
//             //         return { ...height, header: headerHeight, footer: footerHeight }
//             //     })
//             // }
//         }
//     }, [onLoadData])

//     // 渲染每行
//     const renderRow = useCallback((data: IVirtualListRowRenderProps<T>) => {
//         return typeof rowRender === "function" && rowRender(data)
//     }, [rowRender])

//     // 渲染显示的内容
//     const renderDisplayContent = useCallback((list: T[]) => {
//         const { rowHeight, startIndex, endIndex, rowCount } = instance.current
//         const content: React.ReactNode[] = []
//         if (list.length === 0) 
//             return content
//         for (let i = startIndex; i < (startIndex + rowCount); ++i) {
//             const data: IVirtualListRowRenderProps<T> = {
//                 index: i,
//                 item: list[i],
//                 style: {
//                     height: `${rowHeight - 1}px`,
//                     lineHeight: `${rowHeight}px`,
//                     width
//                 }
//             }
//             const row = renderRow(data)
//             content.push(row)
//         }
//         return content
//     }, [renderRow, width])

//     return <div className={"virtual-list-wrapper"}>
//         <div
//             id={id}
//             ref={scrollContainer}
//             className={`virtual-list ${className}`}
//             style={{
//                 height
//             }}
//             onScroll={onScroll}
//             data-total={heightWrapper.total}
//         >
//             <div className={"virtual-list-header"} ref={headerDOM}></div>
//             <div className={"virtual-list-content"} ref={contentDOM}>
//                 {renderDisplayContent(list)}
//             </div>
//             <div className={"virtual-list-footer"} ref={footerDOM}></div>
//         </div>
//     </div>
// }

export default VirtualList
