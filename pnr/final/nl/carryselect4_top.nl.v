module carryselect4_top (clk,
    ready_out,
    rst_n,
    valid_in,
    valid_out,
    data_in,
    data_out);
 input clk;
 output ready_out;
 input rst_n;
 input valid_in;
 output valid_out;
 input [8:0] data_in;
 output [4:0] data_out;

 wire _00_;
 wire _01_;
 wire _02_;
 wire _03_;
 wire _04_;
 wire _05_;
 wire _06_;
 wire _07_;
 wire _08_;
 wire _09_;
 wire _10_;
 wire _11_;
 wire _12_;
 wire _13_;
 wire \a_q[0] ;
 wire \a_q[1] ;
 wire \a_q[2] ;
 wire \a_q[3] ;
 wire \b_q[0] ;
 wire \b_q[1] ;
 wire \b_q[2] ;
 wire \b_q[3] ;
 wire cin_q;
 wire cout_comb;
 wire cout_q;
 wire net1;
 wire net2;
 wire net3;
 wire net4;
 wire net5;
 wire net6;
 wire net7;
 wire net8;
 wire net9;
 wire net12;
 wire net13;
 wire net14;
 wire net15;
 wire net16;
 wire ld_en;
 wire out_en;
 wire net17;
 wire net10;
 wire \sum_comb[0] ;
 wire \sum_comb[1] ;
 wire \sum_comb[2] ;
 wire \sum_comb[3] ;
 wire net11;
 wire net18;
 wire clknet_0_clk;
 wire net20;
 wire \u_csla/c2 ;
 wire \u_csla/co_hi0 ;
 wire \u_csla/co_hi1 ;
 wire \u_csla/s_hi0[0] ;
 wire \u_csla/s_hi0[1] ;
 wire \u_csla/s_hi1[0] ;
 wire \u_csla/s_hi1[1] ;
 wire \u_csla/u_hi0/c1 ;
 wire \u_csla/u_hi0/u_fa0/_0_ ;
 wire \u_csla/u_hi0/u_fa0/_1_ ;
 wire \u_csla/u_hi0/u_fa1/_0_ ;
 wire \u_csla/u_hi0/u_fa1/_1_ ;
 wire \u_csla/u_hi1/c1 ;
 wire \u_csla/u_hi1/u_fa0/_0_ ;
 wire \u_csla/u_hi1/u_fa0/_1_ ;
 wire \u_csla/u_hi1/u_fa1/_0_ ;
 wire \u_csla/u_hi1/u_fa1/_1_ ;
 wire \u_csla/u_low/c1 ;
 wire \u_csla/u_low/u_fa0/_0_ ;
 wire \u_csla/u_low/u_fa0/_1_ ;
 wire \u_csla/u_low/u_fa1/_0_ ;
 wire \u_csla/u_low/u_fa1/_1_ ;
 wire \u_ctrl/state[0] ;
 wire \u_ctrl/state[1] ;
 wire net;
 wire net19;
 wire net21;
 wire clknet_1_0__leaf_clk;
 wire clknet_1_1__leaf_clk;
 wire net22;
 wire net23;
 wire net24;
 wire net25;
 wire net26;
 wire net27;
 wire net28;
 wire net29;
 wire net30;
 wire net31;

 sky130_fd_sc_hd__fill_2 FILLER_0_26 ();
 sky130_fd_sc_hd__decap_3 FILLER_0_3 ();
 sky130_fd_sc_hd__decap_3 FILLER_0_36 ();
 sky130_fd_sc_hd__decap_3 FILLER_0_52 ();
 sky130_fd_sc_hd__fill_1 FILLER_0_55 ();
 sky130_fd_sc_hd__fill_1 FILLER_0_57 ();
 sky130_fd_sc_hd__decap_3 FILLER_0_6 ();
 sky130_fd_sc_hd__decap_3 FILLER_0_68 ();
 sky130_fd_sc_hd__fill_2 FILLER_0_85 ();
 sky130_fd_sc_hd__fill_2 FILLER_10_15 ();
 sky130_fd_sc_hd__decap_3 FILLER_10_25 ();
 sky130_fd_sc_hd__decap_3 FILLER_10_3 ();
 sky130_fd_sc_hd__fill_2 FILLER_10_45 ();
 sky130_fd_sc_hd__decap_3 FILLER_10_72 ();
 sky130_fd_sc_hd__fill_1 FILLER_10_75 ();
 sky130_fd_sc_hd__fill_2 FILLER_10_85 ();
 sky130_fd_sc_hd__fill_2 FILLER_11_25 ();
 sky130_fd_sc_hd__fill_1 FILLER_11_3 ();
 sky130_fd_sc_hd__decap_3 FILLER_11_53 ();
 sky130_fd_sc_hd__decap_3 FILLER_11_65 ();
 sky130_fd_sc_hd__decap_3 FILLER_11_68 ();
 sky130_fd_sc_hd__decap_3 FILLER_12_25 ();
 sky130_fd_sc_hd__decap_3 FILLER_12_29 ();
 sky130_fd_sc_hd__fill_1 FILLER_12_3 ();
 sky130_fd_sc_hd__fill_2 FILLER_12_32 ();
 sky130_fd_sc_hd__decap_3 FILLER_12_54 ();
 sky130_fd_sc_hd__fill_2 FILLER_12_57 ();
 sky130_fd_sc_hd__fill_1 FILLER_12_80 ();
 sky130_fd_sc_hd__fill_2 FILLER_12_85 ();
 sky130_fd_sc_hd__fill_2 FILLER_13_3 ();
 sky130_fd_sc_hd__fill_2 FILLER_13_57 ();
 sky130_fd_sc_hd__decap_3 FILLER_14_25 ();
 sky130_fd_sc_hd__decap_3 FILLER_14_3 ();
 sky130_fd_sc_hd__decap_3 FILLER_14_45 ();
 sky130_fd_sc_hd__fill_1 FILLER_14_48 ();
 sky130_fd_sc_hd__decap_3 FILLER_14_57 ();
 sky130_fd_sc_hd__decap_3 FILLER_14_6 ();
 sky130_fd_sc_hd__decap_3 FILLER_14_60 ();
 sky130_fd_sc_hd__decap_3 FILLER_14_71 ();
 sky130_fd_sc_hd__fill_2 FILLER_14_74 ();
 sky130_fd_sc_hd__fill_2 FILLER_14_85 ();
 sky130_fd_sc_hd__fill_2 FILLER_1_3 ();
 sky130_fd_sc_hd__fill_1 FILLER_1_42 ();
 sky130_fd_sc_hd__fill_2 FILLER_1_67 ();
 sky130_fd_sc_hd__fill_2 FILLER_1_85 ();
 sky130_fd_sc_hd__decap_3 FILLER_2_24 ();
 sky130_fd_sc_hd__fill_1 FILLER_2_27 ();
 sky130_fd_sc_hd__fill_1 FILLER_2_38 ();
 sky130_fd_sc_hd__fill_1 FILLER_2_52 ();
 sky130_fd_sc_hd__fill_2 FILLER_2_85 ();
 sky130_fd_sc_hd__fill_2 FILLER_3_23 ();
 sky130_fd_sc_hd__fill_1 FILLER_3_64 ();
 sky130_fd_sc_hd__fill_2 FILLER_3_85 ();
 sky130_fd_sc_hd__fill_1 FILLER_4_66 ();
 sky130_fd_sc_hd__decap_3 FILLER_4_80 ();
 sky130_fd_sc_hd__fill_1 FILLER_4_83 ();
 sky130_fd_sc_hd__fill_2 FILLER_4_85 ();
 sky130_fd_sc_hd__fill_2 FILLER_5_14 ();
 sky130_fd_sc_hd__fill_2 FILLER_5_3 ();
 sky130_fd_sc_hd__fill_1 FILLER_5_44 ();
 sky130_fd_sc_hd__fill_2 FILLER_5_54 ();
 sky130_fd_sc_hd__fill_1 FILLER_5_86 ();
 sky130_fd_sc_hd__decap_3 FILLER_6_24 ();
 sky130_fd_sc_hd__fill_1 FILLER_6_27 ();
 sky130_fd_sc_hd__decap_3 FILLER_6_79 ();
 sky130_fd_sc_hd__fill_2 FILLER_6_82 ();
 sky130_fd_sc_hd__fill_2 FILLER_6_85 ();
 sky130_fd_sc_hd__fill_2 FILLER_7_19 ();
 sky130_fd_sc_hd__fill_2 FILLER_7_54 ();
 sky130_fd_sc_hd__fill_1 FILLER_7_73 ();
 sky130_fd_sc_hd__decap_3 FILLER_7_83 ();
 sky130_fd_sc_hd__fill_1 FILLER_7_86 ();
 sky130_fd_sc_hd__fill_2 FILLER_8_15 ();
 sky130_fd_sc_hd__decap_3 FILLER_8_25 ();
 sky130_fd_sc_hd__decap_3 FILLER_8_3 ();
 sky130_fd_sc_hd__decap_3 FILLER_8_36 ();
 sky130_fd_sc_hd__fill_2 FILLER_8_39 ();
 sky130_fd_sc_hd__fill_1 FILLER_8_62 ();
 sky130_fd_sc_hd__fill_2 FILLER_8_85 ();
 sky130_fd_sc_hd__fill_1 FILLER_9_31 ();
 sky130_fd_sc_hd__fill_2 FILLER_9_54 ();
 sky130_fd_sc_hd__fill_1 FILLER_9_78 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_0_Left_15 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_0_Right_0 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_10_Left_25 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_10_Right_10 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_11_Left_26 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_11_Right_11 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_12_Left_27 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_12_Right_12 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_13_Left_28 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_13_Right_13 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_14_Left_29 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_14_Right_14 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_1_Left_16 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_1_Right_1 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_2_Left_17 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_2_Right_2 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_3_Left_18 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_3_Right_3 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_4_Left_19 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_4_Right_4 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_5_Left_20 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_5_Right_5 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_6_Left_21 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_6_Right_6 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_7_Left_22 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_7_Right_7 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_8_Left_23 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_8_Right_8 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_9_Left_24 ();
 sky130_fd_sc_hd__decap_3 PHY_EDGE_ROW_9_Right_9 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_0_30 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_0_31 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_0_32 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_10_46 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_10_47 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_11_48 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_12_49 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_12_50 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_13_51 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_14_52 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_14_53 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_14_54 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_1_33 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_2_34 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_2_35 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_3_36 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_4_37 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_4_38 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_5_39 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_6_40 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_6_41 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_7_42 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_8_43 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_8_44 ();
 sky130_fd_sc_hd__tapvpwrvgnd_1 TAP_TAPCELL_ROW_9_45 ();
 sky130_fd_sc_hd__mux2_1 _14_ (.A0(net26),
    .A1(\sum_comb[0] ),
    .S(out_en),
    .X(_00_));
 sky130_fd_sc_hd__mux2_1 _15_ (.A0(net25),
    .A1(\sum_comb[1] ),
    .S(out_en),
    .X(_01_));
 sky130_fd_sc_hd__mux2_1 _16_ (.A0(net23),
    .A1(\sum_comb[2] ),
    .S(out_en),
    .X(_02_));
 sky130_fd_sc_hd__mux2_1 _17_ (.A0(net24),
    .A1(\sum_comb[3] ),
    .S(out_en),
    .X(_03_));
 sky130_fd_sc_hd__mux2_1 _18_ (.A0(net22),
    .A1(cout_comb),
    .S(out_en),
    .X(_04_));
 sky130_fd_sc_hd__mux2_1 _19_ (.A0(net30),
    .A1(net1),
    .S(ld_en),
    .X(_05_));
 sky130_fd_sc_hd__mux2_1 _20_ (.A0(net28),
    .A1(net2),
    .S(ld_en),
    .X(_06_));
 sky130_fd_sc_hd__mux2_1 _21_ (.A0(\a_q[2] ),
    .A1(net3),
    .S(ld_en),
    .X(_07_));
 sky130_fd_sc_hd__mux2_1 _22_ (.A0(\a_q[3] ),
    .A1(net4),
    .S(ld_en),
    .X(_08_));
 sky130_fd_sc_hd__mux2_1 _23_ (.A0(net29),
    .A1(net5),
    .S(ld_en),
    .X(_09_));
 sky130_fd_sc_hd__mux2_1 _24_ (.A0(net31),
    .A1(net6),
    .S(ld_en),
    .X(_10_));
 sky130_fd_sc_hd__mux2_1 _25_ (.A0(\b_q[2] ),
    .A1(net7),
    .S(ld_en),
    .X(_11_));
 sky130_fd_sc_hd__mux2_1 _26_ (.A0(\b_q[3] ),
    .A1(net8),
    .S(ld_en),
    .X(_12_));
 sky130_fd_sc_hd__mux2_1 _27_ (.A0(net27),
    .A1(net9),
    .S(ld_en),
    .X(_13_));
 sky130_fd_sc_hd__dfrtp_2 _28_ (.CLK(clknet_1_1__leaf_clk),
    .D(_00_),
    .RESET_B(net10),
    .Q(net12));
 sky130_fd_sc_hd__dfrtp_2 _29_ (.CLK(clknet_1_0__leaf_clk),
    .D(_01_),
    .RESET_B(net10),
    .Q(net13));
 sky130_fd_sc_hd__dfrtp_2 _30_ (.CLK(clknet_1_1__leaf_clk),
    .D(_02_),
    .RESET_B(net10),
    .Q(net14));
 sky130_fd_sc_hd__dfrtp_2 _31_ (.CLK(clknet_1_0__leaf_clk),
    .D(_03_),
    .RESET_B(net10),
    .Q(net15));
 sky130_fd_sc_hd__dfrtp_2 _32_ (.CLK(clknet_1_0__leaf_clk),
    .D(_04_),
    .RESET_B(net10),
    .Q(cout_q));
 sky130_fd_sc_hd__dfrtp_2 _33_ (.CLK(clknet_1_1__leaf_clk),
    .D(_05_),
    .RESET_B(net10),
    .Q(\a_q[0] ));
 sky130_fd_sc_hd__dfrtp_2 _34_ (.CLK(clknet_1_1__leaf_clk),
    .D(_06_),
    .RESET_B(net10),
    .Q(\a_q[1] ));
 sky130_fd_sc_hd__dfrtp_2 _35_ (.CLK(clknet_1_1__leaf_clk),
    .D(_07_),
    .RESET_B(net10),
    .Q(\a_q[2] ));
 sky130_fd_sc_hd__dfrtp_2 _36_ (.CLK(clknet_1_0__leaf_clk),
    .D(_08_),
    .RESET_B(net10),
    .Q(\a_q[3] ));
 sky130_fd_sc_hd__dfrtp_2 _37_ (.CLK(clknet_1_1__leaf_clk),
    .D(_09_),
    .RESET_B(net10),
    .Q(\b_q[0] ));
 sky130_fd_sc_hd__dfrtp_2 _38_ (.CLK(clknet_1_0__leaf_clk),
    .D(_10_),
    .RESET_B(net10),
    .Q(\b_q[1] ));
 sky130_fd_sc_hd__dfrtp_2 _39_ (.CLK(clknet_1_0__leaf_clk),
    .D(_11_),
    .RESET_B(net10),
    .Q(\b_q[2] ));
 sky130_fd_sc_hd__dfrtp_2 _40_ (.CLK(clknet_1_0__leaf_clk),
    .D(_12_),
    .RESET_B(net10),
    .Q(\b_q[3] ));
 sky130_fd_sc_hd__dfrtp_2 _41_ (.CLK(clknet_1_1__leaf_clk),
    .D(_13_),
    .RESET_B(net10),
    .Q(cin_q));
 sky130_fd_sc_hd__buf_2 _42_ (.A(cout_q),
    .X(net16));
 sky130_fd_sc_hd__clkbuf_16 clkbuf_0_clk (.A(clk),
    .X(clknet_0_clk));
 sky130_fd_sc_hd__clkbuf_16 clkbuf_1_0__f_clk (.A(clknet_0_clk),
    .X(clknet_1_0__leaf_clk));
 sky130_fd_sc_hd__clkbuf_16 clkbuf_1_1__f_clk (.A(clknet_0_clk),
    .X(clknet_1_1__leaf_clk));
 sky130_fd_sc_hd__clkbuf_8 clkload0 (.A(clknet_1_0__leaf_clk));
 sky130_fd_sc_hd__dlygate4sd3_1 hold23 (.A(cout_q),
    .X(net22));
 sky130_fd_sc_hd__dlygate4sd3_1 hold24 (.A(net14),
    .X(net23));
 sky130_fd_sc_hd__dlygate4sd3_1 hold25 (.A(net15),
    .X(net24));
 sky130_fd_sc_hd__dlygate4sd3_1 hold26 (.A(net13),
    .X(net25));
 sky130_fd_sc_hd__dlygate4sd3_1 hold27 (.A(net12),
    .X(net26));
 sky130_fd_sc_hd__dlygate4sd3_1 hold28 (.A(cin_q),
    .X(net27));
 sky130_fd_sc_hd__dlygate4sd3_1 hold29 (.A(\a_q[1] ),
    .X(net28));
 sky130_fd_sc_hd__dlygate4sd3_1 hold30 (.A(\b_q[0] ),
    .X(net29));
 sky130_fd_sc_hd__dlygate4sd3_1 hold31 (.A(\a_q[0] ),
    .X(net30));
 sky130_fd_sc_hd__dlygate4sd3_1 hold32 (.A(\b_q[1] ),
    .X(net31));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input1 (.A(data_in[0]),
    .X(net1));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input10 (.A(rst_n),
    .X(net10));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input11 (.A(valid_in),
    .X(net11));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input2 (.A(data_in[1]),
    .X(net2));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input3 (.A(data_in[2]),
    .X(net3));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input4 (.A(data_in[3]),
    .X(net4));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input5 (.A(data_in[4]),
    .X(net5));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input6 (.A(data_in[5]),
    .X(net6));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input7 (.A(data_in[6]),
    .X(net7));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input8 (.A(data_in[7]),
    .X(net8));
 sky130_fd_sc_hd__clkdlybuf4s25_1 input9 (.A(data_in[8]),
    .X(net9));
 sky130_fd_sc_hd__clkdlybuf4s25_1 output12 (.A(net12),
    .X(data_out[0]));
 sky130_fd_sc_hd__clkdlybuf4s25_1 output13 (.A(net13),
    .X(data_out[1]));
 sky130_fd_sc_hd__clkdlybuf4s25_1 output14 (.A(net14),
    .X(data_out[2]));
 sky130_fd_sc_hd__clkdlybuf4s25_1 output15 (.A(net15),
    .X(data_out[3]));
 sky130_fd_sc_hd__clkdlybuf4s25_1 output16 (.A(net16),
    .X(data_out[4]));
 sky130_fd_sc_hd__clkdlybuf4s25_1 output17 (.A(net17),
    .X(ready_out));
 sky130_fd_sc_hd__clkdlybuf4s25_1 output18 (.A(net18),
    .X(valid_out));
 sky130_fd_sc_hd__a21o_2 \u_csla/u_hi0/u_fa0/_2_  (.A1(\b_q[2] ),
    .A2(\a_q[2] ),
    .B1(net),
    .X(\u_csla/u_hi0/u_fa0/_0_ ));
 sky130_fd_sc_hd__conb_1 \u_csla/u_hi0/u_fa0/_2__19  (.LO(net));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi0/u_fa0/_3_  (.A(\b_q[2] ),
    .B(\a_q[2] ),
    .Y(\u_csla/u_hi0/u_fa0/_1_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi0/u_fa0/_4_  (.A(net19),
    .B(\u_csla/u_hi0/u_fa0/_1_ ),
    .Y(\u_csla/s_hi0[0] ));
 sky130_fd_sc_hd__conb_1 \u_csla/u_hi0/u_fa0/_4__20  (.LO(net19));
 sky130_fd_sc_hd__o21a_2 \u_csla/u_hi0/u_fa0/_5_  (.A1(\b_q[2] ),
    .A2(\a_q[2] ),
    .B1(\u_csla/u_hi0/u_fa0/_0_ ),
    .X(\u_csla/u_hi0/c1 ));
 sky130_fd_sc_hd__a21o_2 \u_csla/u_hi0/u_fa1/_2_  (.A1(\b_q[3] ),
    .A2(\a_q[3] ),
    .B1(\u_csla/u_hi0/c1 ),
    .X(\u_csla/u_hi0/u_fa1/_0_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi0/u_fa1/_3_  (.A(\b_q[3] ),
    .B(\a_q[3] ),
    .Y(\u_csla/u_hi0/u_fa1/_1_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi0/u_fa1/_4_  (.A(\u_csla/u_hi0/c1 ),
    .B(\u_csla/u_hi0/u_fa1/_1_ ),
    .Y(\u_csla/s_hi0[1] ));
 sky130_fd_sc_hd__o21a_2 \u_csla/u_hi0/u_fa1/_5_  (.A1(\b_q[3] ),
    .A2(\a_q[3] ),
    .B1(\u_csla/u_hi0/u_fa1/_0_ ),
    .X(\u_csla/co_hi0 ));
 sky130_fd_sc_hd__a21o_2 \u_csla/u_hi1/u_fa0/_2_  (.A1(\b_q[2] ),
    .A2(\a_q[2] ),
    .B1(net20),
    .X(\u_csla/u_hi1/u_fa0/_0_ ));
 sky130_fd_sc_hd__conb_1 \u_csla/u_hi1/u_fa0/_2__21  (.HI(net20));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi1/u_fa0/_3_  (.A(\b_q[2] ),
    .B(\a_q[2] ),
    .Y(\u_csla/u_hi1/u_fa0/_1_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi1/u_fa0/_4_  (.A(net21),
    .B(\u_csla/u_hi1/u_fa0/_1_ ),
    .Y(\u_csla/s_hi1[0] ));
 sky130_fd_sc_hd__conb_1 \u_csla/u_hi1/u_fa0/_4__22  (.HI(net21));
 sky130_fd_sc_hd__o21a_2 \u_csla/u_hi1/u_fa0/_5_  (.A1(\b_q[2] ),
    .A2(\a_q[2] ),
    .B1(\u_csla/u_hi1/u_fa0/_0_ ),
    .X(\u_csla/u_hi1/c1 ));
 sky130_fd_sc_hd__a21o_2 \u_csla/u_hi1/u_fa1/_2_  (.A1(\b_q[3] ),
    .A2(\a_q[3] ),
    .B1(\u_csla/u_hi1/c1 ),
    .X(\u_csla/u_hi1/u_fa1/_0_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi1/u_fa1/_3_  (.A(\b_q[3] ),
    .B(\a_q[3] ),
    .Y(\u_csla/u_hi1/u_fa1/_1_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_hi1/u_fa1/_4_  (.A(\u_csla/u_hi1/c1 ),
    .B(\u_csla/u_hi1/u_fa1/_1_ ),
    .Y(\u_csla/s_hi1[1] ));
 sky130_fd_sc_hd__o21a_2 \u_csla/u_hi1/u_fa1/_5_  (.A1(\b_q[3] ),
    .A2(\a_q[3] ),
    .B1(\u_csla/u_hi1/u_fa1/_0_ ),
    .X(\u_csla/co_hi1 ));
 sky130_fd_sc_hd__a21o_2 \u_csla/u_low/u_fa0/_2_  (.A1(\b_q[0] ),
    .A2(\a_q[0] ),
    .B1(cin_q),
    .X(\u_csla/u_low/u_fa0/_0_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_low/u_fa0/_3_  (.A(\b_q[0] ),
    .B(\a_q[0] ),
    .Y(\u_csla/u_low/u_fa0/_1_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_low/u_fa0/_4_  (.A(cin_q),
    .B(\u_csla/u_low/u_fa0/_1_ ),
    .Y(\sum_comb[0] ));
 sky130_fd_sc_hd__o21a_2 \u_csla/u_low/u_fa0/_5_  (.A1(\b_q[0] ),
    .A2(\a_q[0] ),
    .B1(\u_csla/u_low/u_fa0/_0_ ),
    .X(\u_csla/u_low/c1 ));
 sky130_fd_sc_hd__a21o_2 \u_csla/u_low/u_fa1/_2_  (.A1(\b_q[1] ),
    .A2(\a_q[1] ),
    .B1(\u_csla/u_low/c1 ),
    .X(\u_csla/u_low/u_fa1/_0_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_low/u_fa1/_3_  (.A(\b_q[1] ),
    .B(\a_q[1] ),
    .Y(\u_csla/u_low/u_fa1/_1_ ));
 sky130_fd_sc_hd__xnor2_2 \u_csla/u_low/u_fa1/_4_  (.A(\u_csla/u_low/c1 ),
    .B(\u_csla/u_low/u_fa1/_1_ ),
    .Y(\sum_comb[1] ));
 sky130_fd_sc_hd__o21a_2 \u_csla/u_low/u_fa1/_5_  (.A1(\b_q[1] ),
    .A2(\a_q[1] ),
    .B1(\u_csla/u_low/u_fa1/_0_ ),
    .X(\u_csla/c2 ));
 sky130_fd_sc_hd__mux2_1 \u_csla/u_mux_co/_0_  (.A0(\u_csla/co_hi0 ),
    .A1(\u_csla/co_hi1 ),
    .S(\u_csla/c2 ),
    .X(cout_comb));
 sky130_fd_sc_hd__mux2_1 \u_csla/u_mux_s2/_0_  (.A0(\u_csla/s_hi0[0] ),
    .A1(\u_csla/s_hi1[0] ),
    .S(\u_csla/c2 ),
    .X(\sum_comb[2] ));
 sky130_fd_sc_hd__mux2_1 \u_csla/u_mux_s3/_0_  (.A0(\u_csla/s_hi0[1] ),
    .A1(\u_csla/s_hi1[1] ),
    .S(\u_csla/c2 ),
    .X(\sum_comb[3] ));
 sky130_fd_sc_hd__inv_2 \u_ctrl/_0_  (.A(\u_ctrl/state[0] ),
    .Y(net17));
 sky130_fd_sc_hd__and2b_2 \u_ctrl/_1_  (.A_N(\u_ctrl/state[0] ),
    .B(\u_ctrl/state[1] ),
    .X(net18));
 sky130_fd_sc_hd__and2b_2 \u_ctrl/_2_  (.A_N(\u_ctrl/state[0] ),
    .B(net11),
    .X(ld_en));
 sky130_fd_sc_hd__and2b_2 \u_ctrl/_3_  (.A_N(\u_ctrl/state[1] ),
    .B(\u_ctrl/state[0] ),
    .X(out_en));
 sky130_fd_sc_hd__dfrtp_2 \u_ctrl/_4_  (.CLK(clknet_1_1__leaf_clk),
    .D(ld_en),
    .RESET_B(net10),
    .Q(\u_ctrl/state[0] ));
 sky130_fd_sc_hd__dfrtp_2 \u_ctrl/_5_  (.CLK(clknet_1_1__leaf_clk),
    .D(out_en),
    .RESET_B(net10),
    .Q(\u_ctrl/state[1] ));
endmodule
