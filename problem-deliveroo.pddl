;; problem file: problem-deliveroo-go_to-0.pddl
(define (problem default)
    (:domain default)
    (:objects MunichMafia_1 - agent
t7_6 t1_2 t0_2 t1_4 t0_4 t1_6 t0_6 t1_1 t1_0 t2_2 t1_3 t2_4 t1_5 t2_6 t1_7 t1_8 t2_8 t1_9 t3_2 t3_4 t3_6 t3_8 t4_2 t4_4 t4_6 t3_9 t4_9 t5_2 t5_4 t5_6 t5_9 t6_0 t5_0 t5_1 t6_1 t6_2 t5_3 t6_3 t6_4 t5_5 t6_5 t6_6 t5_7 t6_7 t5_8 t6_8 t6_9 t7_2 t7_9 t8_2 t8_6 t8_9 t9_2 t9_4 t8_4 t8_5 t9_6 t9_9 t9_3 - tile
p1 - parcel)
    (:init (me MunichMafia_1) (at MunichMafia_1 t7_6) (left t1_2 t0_2) (right t0_2 t1_2) (left t1_4 t0_4) (right t0_4 t1_4) (left t1_6 t0_6) (right t0_6 t1_6) (down t1_1 t1_0) (up t1_0 t1_1) (down t1_2 t1_1) (up t1_1 t1_2) (left t2_2 t1_2) (right t1_2 t2_2) (down t1_3 t1_2) (up t1_2 t1_3) (down t1_4 t1_3) (up t1_3 t1_4) (left t2_4 t1_4) (right t1_4 t2_4) (down t1_5 t1_4) (up t1_4 t1_5) (down t1_6 t1_5) (up t1_5 t1_6) (left t2_6 t1_6) (right t1_6 t2_6) (down t1_7 t1_6) (up t1_6 t1_7) (down t1_8 t1_7) (up t1_7 t1_8) (left t2_8 t1_8) (right t1_8 t2_8) (down t1_9 t1_8) (up t1_8 t1_9) (left t3_2 t2_2) (right t2_2 t3_2) (left t3_4 t2_4) (right t2_4 t3_4) (left t3_6 t2_6) (right t2_6 t3_6) (left t3_8 t2_8) (right t2_8 t3_8) (left t4_2 t3_2) (right t3_2 t4_2) (left t4_4 t3_4) (right t3_4 t4_4) (left t4_6 t3_6) (right t3_6 t4_6) (down t3_9 t3_8) (up t3_8 t3_9) (left t4_9 t3_9) (right t3_9 t4_9) (left t5_2 t4_2) (right t4_2 t5_2) (left t5_4 t4_4) (right t4_4 t5_4) (left t5_6 t4_6) (right t4_6 t5_6) (left t5_9 t4_9) (right t4_9 t5_9) (left t6_0 t5_0) (right t5_0 t6_0) (down t5_1 t5_0) (up t5_0 t5_1) (left t6_1 t5_1) (right t5_1 t6_1) (down t5_2 t5_1) (up t5_1 t5_2) (left t6_2 t5_2) (right t5_2 t6_2) (down t5_3 t5_2) (up t5_2 t5_3) (left t6_3 t5_3) (right t5_3 t6_3) (down t5_4 t5_3) (up t5_3 t5_4) (left t6_4 t5_4) (right t5_4 t6_4) (down t5_5 t5_4) (up t5_4 t5_5) (left t6_5 t5_5) (right t5_5 t6_5) (down t5_6 t5_5) (up t5_5 t5_6) (left t6_6 t5_6) (right t5_6 t6_6) (down t5_7 t5_6) (up t5_6 t5_7) (left t6_7 t5_7) (down t5_8 t5_7) (up t5_7 t5_8) (left t6_8 t5_8) (right t5_8 t6_8) (down t5_9 t5_8) (up t5_8 t5_9) (left t6_9 t5_9) (right t5_9 t6_9) (down t6_1 t6_0) (up t6_0 t6_1) (down t6_2 t6_1) (up t6_1 t6_2) (left t7_2 t6_2) (right t6_2 t7_2) (down t6_3 t6_2) (up t6_2 t6_3) (down t6_4 t6_3) (up t6_3 t6_4) (down t6_5 t6_4) (up t6_4 t6_5) (down t6_6 t6_5) (up t6_5 t6_6) (left t7_6 t6_6) (right t6_6 t7_6) (down t6_7 t6_6) (up t6_7 t6_8) (down t6_9 t6_8) (up t6_8 t6_9) (left t7_9 t6_9) (right t6_9 t7_9) (left t8_2 t7_2) (right t7_2 t8_2) (left t8_6 t7_6) (right t7_6 t8_6) (left t8_9 t7_9) (right t7_9 t8_9) (left t9_2 t8_2) (right t8_2 t9_2) (left t9_4 t8_4) (right t8_4 t9_4) (down t8_5 t8_4) (up t8_4 t8_5) (down t8_6 t8_5) (up t8_5 t8_6) (left t9_6 t8_6) (right t8_6 t9_6) (left t9_9 t8_9) (right t8_9 t9_9) (down t9_3 t9_2) (up t9_2 t9_3) (down t9_4 t9_3) (up t9_3 t9_4))
    (:goal (at MunichMafia_1 t5_6))
)